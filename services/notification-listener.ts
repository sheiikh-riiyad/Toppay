import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import { NativeModules, Platform } from 'react-native';

import { db } from '@/services/firebase';

type CapturedNotification = {
  id: string;
  uid: string;
  packageName: string;
  title: string;
  text: string;
  postedAt: number;
};

type NativeNotificationQueue = {
  hasAccess(): Promise<boolean>;
  openSettings(): Promise<void>;
  setOwner(uid: string | null): Promise<void>;
  getPending(): Promise<string>;
  acknowledge(id: string): Promise<void>;
};

function nativeQueue(): NativeNotificationQueue | null {
  return Platform.OS === 'android' ? NativeModules.ToppayNotificationQueue ?? null : null;
}

export async function hasNotificationAccess(): Promise<boolean> {
  const module = nativeQueue();
  if (!module) throw new Error('NATIVE_NOTIFICATION_LISTENER_MISSING');
  return module.hasAccess();
}

export async function openNotificationAccessSettings(): Promise<void> {
  const module = nativeQueue();
  if (!module) throw new Error('NATIVE_NOTIFICATION_LISTENER_MISSING');
  await module.openSettings();
}

export async function setNotificationOwner(uid: string | null): Promise<void> {
  await nativeQueue()?.setOwner(uid);
}

let syncing = false;

export async function syncCapturedNotifications(uid: string): Promise<void> {
  const queueModule = nativeQueue();
  if (!queueModule || !uid || syncing) return;
  syncing = true;
  try {
    const pending = JSON.parse(await queueModule.getPending()) as CapturedNotification[];
    const destination = collection(db, 'users', uid, 'notification');
    for (const item of pending) {
      if (item.uid !== uid || !item.id || !item.packageName || !Number.isFinite(item.postedAt)) continue;
      const postedDate = new Date(item.postedAt);
      if (Number.isNaN(postedDate.getTime())) continue;
      const twoDigits = (value: number) => String(value).padStart(2, '0');
      await setDoc(doc(destination, item.id), {
        packageName: item.packageName,
        title: item.title,
        text: item.text,
        postedAt: item.postedAt,
        time: `${twoDigits(postedDate.getHours())}:${twoDigits(postedDate.getMinutes())}:${twoDigits(postedDate.getSeconds())}`,
        date: `${twoDigits(postedDate.getDate())}/${twoDigits(postedDate.getMonth() + 1)}/${postedDate.getFullYear()}`,
      });
      const snapshot = await getDocs(query(destination, orderBy('postedAt', 'desc')));
      await Promise.all(snapshot.docs.slice(10).map((oldDoc) => deleteDoc(oldDoc.ref)));
      await queueModule.acknowledge(item.id);
    }
  } finally {
    syncing = false;
  }
}

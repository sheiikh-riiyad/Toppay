import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore';
import * as IntentLauncher from 'expo-intent-launcher';
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

type NotificationListenerModule = {
  setOwner(uid: string | null): Promise<void>;
  hasAccess(): Promise<boolean>;
  openSettings(): Promise<void>;
  getPending(): Promise<string>;
  acknowledge(id: string): Promise<void>;
};

function nativeModule(): NotificationListenerModule | null {
  return Platform.OS === 'android' ? NativeModules.ToppayNotificationListener ?? null : null;
}

export async function hasNotificationAccess(): Promise<boolean> {
  const module = nativeModule();
  if (!module) throw new Error('NATIVE_LISTENER_MISSING');
  return module.hasAccess();
}

export async function setNotificationOwner(uid: string | null): Promise<void> {
  await nativeModule()?.setOwner(uid);
}

export async function openNotificationAccessSettings(): Promise<void> {
  const module = nativeModule();
  if (module) {
    try {
      await module.openSettings();
      return;
    } catch { /* Some Android variants reject this intent; try the Expo bridge. */ }
  }
  await IntentLauncher.startActivityAsync('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
}

let syncing = false;

export async function syncCapturedNotifications(uid: string): Promise<void> {
  const module = nativeModule();
  if (!module || !uid || syncing) return;
  syncing = true;
  try {
    const pending = JSON.parse(await module.getPending()) as CapturedNotification[];
    const destination = collection(db, 'users', uid, 'notification');
    for (const item of pending) {
      if (item.uid !== uid) continue;
      if (!item.id || !item.packageName || !Number.isFinite(item.postedAt)) continue;
      await setDoc(doc(destination, item.id), {
        packageName: item.packageName,
        title: item.title,
        text: item.text,
        postedAt: item.postedAt,
      });
      const snapshot = await getDocs(query(destination, orderBy('postedAt', 'desc')));
      await Promise.all(snapshot.docs.slice(10).map((oldDoc) => deleteDoc(oldDoc.ref)));
      await module.acknowledge(item.id);
    }
  } finally {
    syncing = false;
  }
}

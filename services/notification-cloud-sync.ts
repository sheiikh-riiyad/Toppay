import {
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    writeBatch
} from 'firebase/firestore';

import { db } from '@/services/firebase';
import type { CapturedPaymentNotification } from '@/services/notification-capture';

const MAX_STORED_NOTIFICATIONS = 50;

export async function syncCapturedNotifications(
  uid: string,
  notifications: CapturedPaymentNotification[]
) {
  const notificationsRef = collection(db, 'users', uid, 'notification');
  const snapshot = await getDocs(query(notificationsRef, orderBy('timestamp', 'desc')));
  const existing = new Map(snapshot.docs.map((item) => [item.id, item]));
  const records = new Map<string, { id: string; timestamp: number; notification?: CapturedPaymentNotification }>();

  for (const item of snapshot.docs) {
    const data = item.data();
    records.set(item.id, { id: item.id, timestamp: Number(data.timestamp) || 0 });
  }

  for (const notification of notifications) {
    const id = encodeURIComponent(notification.id);
    records.set(id, { id, timestamp: notification.timestamp, notification });
  }

  const newest = [...records.values()]
    .sort((left, right) => right.timestamp - left.timestamp || right.id.localeCompare(left.id))
    .slice(0, MAX_STORED_NOTIFICATIONS);
  const keepIds = new Set(newest.map((item) => item.id));
  const batch = writeBatch(db);
  let hasWrites = false;

  for (const record of newest) {
    if (!record.notification) continue;

    const reference = doc(notificationsRef, record.id);
    const oldData = existing.get(record.id)?.data();
    const item = record.notification;
    if (
      oldData?.provider === item.provider
      && oldData?.title === item.title
      && oldData?.body === item.body
      && oldData?.timestamp === item.timestamp
    ) continue;

    batch.set(reference, item);
    hasWrites = true;
  }

  for (const item of snapshot.docs) {
    if (keepIds.has(item.id)) continue;
    batch.delete(item.ref);
    hasWrites = true;
  }

  if (hasWrites) await batch.commit();
}
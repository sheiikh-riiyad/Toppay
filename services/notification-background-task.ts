import { Platform } from 'react-native';

import { auth } from '@/services/firebase';
import { syncCapturedNotifications } from '@/services/notification-listener';

const TASK_NAME = 'toppay-notification-upload';
let BackgroundTask: typeof import('expo-background-task') | null = null;
let TaskManager: typeof import('expo-task-manager') | null = null;

if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    BackgroundTask = require('expo-background-task');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    TaskManager = require('expo-task-manager');
  } catch (error) {
    // An older installed APK can load newer JavaScript without these native modules.
    console.warn('Background notification upload requires a rebuilt APK', error);
  }
}

if (BackgroundTask && TaskManager) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await auth.authStateReady();
      const uid = auth.currentUser?.uid;
      if (uid) await syncCapturedNotifications(uid);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      console.warn('Background notification upload failed', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerNotificationUploadTask(): Promise<void> {
  if (!BackgroundTask || !TaskManager) return;
  if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) return;
  await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
}

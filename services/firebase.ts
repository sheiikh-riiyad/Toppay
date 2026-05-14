// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Analytics } from 'firebase/analytics';
import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCtc1Lb4_nRyC74OpqniYXA_9OzzPKms78',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'toppay-2bd66.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'toppay-2bd66',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'toppay-2bd66.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '372853268456',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:372853268456:web:7683ef74c280584e50ce5d',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-FXPQZEJ69Y',
};

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = Platform.OS === 'web' ? getAuth(firebaseApp) : initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics() {
  if (Platform.OS !== 'web') {
    return Promise.resolve(null);
  }

  analyticsPromise ??= import('firebase/analytics').then(async ({ getAnalytics, isSupported }) => {
    const supported = await isSupported();
    return supported ? getAnalytics(firebaseApp) : null;
  });

  return analyticsPromise;
}

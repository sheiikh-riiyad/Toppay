import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type CapturedPaymentNotification = {
  id: string;
  provider: string;
  title: string;
  body: string;
  timestamp: number;
};

type NativeNotificationCapture = {
  isAccessEnabled(): boolean;
  isCaptureEnabled(): boolean;
  setCaptureEnabled(enabled: boolean): void;
  openAccessSettings(): void;
  getEventsJson(): string;
  clearEvents(): void;
};

const nativeModule = Platform.OS === 'android'
  ? requireOptionalNativeModule<NativeNotificationCapture>('ToppayNotificationCapture')
  : null;

export function notificationCaptureAvailable() {
  return Boolean(nativeModule);
}

export function getNotificationCaptureStatus() {
  return {
    accessEnabled: nativeModule?.isAccessEnabled() ?? false,
    captureEnabled: nativeModule?.isCaptureEnabled() ?? false,
  };
}

export function setNotificationCaptureEnabled(enabled: boolean) {
  nativeModule?.setCaptureEnabled(enabled);
}

export function openNotificationAccessSettings() {
  nativeModule?.openAccessSettings();
}

export function getCapturedPaymentNotifications(): CapturedPaymentNotification[] {
  if (!nativeModule) return [];
  try {
    const data: unknown = JSON.parse(nativeModule.getEventsJson());
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is CapturedPaymentNotification =>
      item != null && typeof item === 'object'
      && typeof item.id === 'string'
      && typeof item.provider === 'string'
      && typeof item.title === 'string'
      && typeof item.body === 'string'
      && typeof item.timestamp === 'number');
  } catch {
    return [];
  }
}

export function clearCapturedPaymentNotifications() {
  nativeModule?.clearEvents();
}

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AppUpdatePrompt } from '@/components/AppUpdatePrompt';
import { palette } from '@/constants/toppay';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/i18n';
import { getCapturedPaymentNotifications, getNotificationCaptureStatus, notificationCaptureAvailable, openNotificationAccessSettings, setNotificationCaptureEnabled } from '@/services/notification-capture';
import { syncCapturedNotifications } from '@/services/notification-cloud-sync';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default React.memo(function RootLayout() {
  const colorScheme = useColorScheme();
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.ink,
      border: palette.border,
      notification: palette.primary,
    },
  };

  return (
    <AuthProvider>
      <ThemeProvider value={navigationTheme}>
        <View style={styles.webCanvas}>
          <View style={styles.appShell}>
            <RootNavigator />
            <AuthenticatedUpdatePrompt />
            <NotificationCaptureCloudSync />
            <NotificationAccessGate />
          </View>
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
});

function RootNavigator() {
  const { isAuthenticated, isReady } = useAuth();
  const unlocked = isReady && isAuthenticated;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!unlocked}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={unlocked}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="send-money" />
      <Stack.Screen name="cash-out" />
      <Stack.Screen name="cash-out-confirmation" />
      <Stack.Screen name="cash-out-submitted" />
      <Stack.Screen name="add-balance" />
      <Stack.Screen name="add-balance-submitted" />
      <Stack.Screen name="mobile-recharge" />
      <Stack.Screen name="mobile-recharge-confirmation" />
      <Stack.Screen name="mobile-recharge-submitted" />
      <Stack.Screen name="bill-pay" />
      <Stack.Screen name="bill-pay-confirmation" />
      <Stack.Screen name="bill-pay-submitted" />
      <Stack.Screen name="send-money-confirmation" />
      <Stack.Screen name="send-money-submitted" />
      <Stack.Screen name="pending-transactions" />
      <Stack.Screen name="pin-change" />
      <Stack.Screen name="pin-change-confirmation" />
      <Stack.Screen name="pin-change-submitted" />
      <Stack.Screen name="device-management" />
      <Stack.Screen name="personal-information" />
      <Stack.Screen name="payment-methods" />
      <Stack.Screen name="notification-capture" />
      <Stack.Screen name="provider-actions" />
      </Stack.Protected>
      <Stack.Screen name="support" />
    </Stack>
  );
}

function AuthenticatedUpdatePrompt() {
  const { isReady, isAuthenticated } = useAuth();
  return isReady && isAuthenticated ? <AppUpdatePrompt /> : null;
}

function NotificationCaptureCloudSync() {
  const { account, isAuthenticated, isReady } = useAuth();
  const lastSyncSignature = useRef('');
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !account?.uid || Platform.OS !== 'android' || !notificationCaptureAvailable()) return;

    const sync = async () => {
      if (AppState.currentState !== 'active' || isSyncing.current) return;
      const notifications = getCapturedPaymentNotifications();
      const signature = account.uid + ':' + notifications.map((item) => item.id).join('|');
      if (signature === lastSyncSignature.current) return;

      isSyncing.current = true;
      try {
        await syncCapturedNotifications(account.uid, notifications);
        lastSyncSignature.current = signature;
      } catch (error) {
        console.warn('Captured notification sync failed:', error);
      } finally {
        isSyncing.current = false;
      }
    };

    void sync();
    const timer = setInterval(() => { void sync(); }, 15000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [account?.uid, isAuthenticated, isReady]);

  return null;
}

function NotificationAccessGate() {
  const { t } = useTranslation();
  const [needsAccess, setNeedsAccess] = useState(() =>
    Platform.OS === 'android' && notificationCaptureAvailable() && !getNotificationCaptureStatus().accessEnabled
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || !notificationCaptureAvailable()) return;
    const checkAccess = () => {
      const accessEnabled = getNotificationCaptureStatus().accessEnabled;
      setNeedsAccess(!accessEnabled);
    };
    checkAccess();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkAccess();
    });
    return () => subscription.remove();
  }, []);

  if (!needsAccess) return null;

  return (
    <View style={styles.accessOverlay}>
      <View style={styles.accessCard}>
        <Text style={styles.accessTitle}>{t('notificationCapture.accessTitle')}</Text>
        <Text style={styles.accessDescription}>{t('notificationCapture.accessDescription')}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.accessButton}
          onPress={() => {
            setNotificationCaptureEnabled(true);
            openNotificationAccessSettings();
          }}>
          <Text style={styles.accessButtonText}>{t('notificationCapture.openSettings')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webCanvas: {
    flex: 1,
    backgroundColor: palette.background,
    ...(Platform.OS === 'web' ? {
      alignItems: 'center',
      minHeight: '100%',
      width: '100%',
    } : null),
  },
  appShell: {
    flex: 1,
    width: '100%',
    backgroundColor: palette.background,
    ...(Platform.OS === 'web' ? {
      maxWidth: 720,
      overflow: 'hidden',
      shadowColor: '#3B1527',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.12,
      shadowRadius: 38,
    } : null),
  },
  accessOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  accessCard: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    gap: 18,
    borderRadius: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  accessTitle: { color: palette.ink, fontSize: 21, fontWeight: '700' },
  accessDescription: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  accessButton: { minHeight: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  accessButtonText: { color: palette.surface, fontSize: 15, fontWeight: '700' },
});

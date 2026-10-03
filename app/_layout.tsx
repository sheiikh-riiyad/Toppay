import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { AppUpdatePrompt } from '@/components/AppUpdatePrompt';
import { palette } from '@/constants/toppay';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/i18n';
import { auth } from '@/services/firebase';
import { hasNotificationAccess, openNotificationAccessSettings, setNotificationOwner, syncCapturedNotifications } from '@/services/notification-listener';

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
            <NotificationAccessGate>
              <RootNavigator />
              <AuthenticatedUpdatePrompt />
            </NotificationAccessGate>
            <NotificationSync />
          </View>
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
});

function NotificationAccessGate({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<boolean | null>(Platform.OS === 'android' ? null : true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let mounted = true;
    const check = async (openIfDenied: boolean) => {
      try {
        const allowed = await hasNotificationAccess();
        if (!mounted) return;
        setAccess(allowed);
        if (!allowed && openIfDenied) await openNotificationAccessSettings();
      } catch {
        if (mounted) {
          setAccess(false);
          setError('এই build-এ নোটিফিকেশন লিসেনার নেই। নতুন Android debug build ইনস্টল করুন।');
        }
      }
    };
    void check(true);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check(false);
    });
    return () => { mounted = false; subscription.remove(); };
  }, []);

  if (access === true) return <>{children}</>;
  return (
    <View style={styles.accessGate}>
      {access === null ? (
        <ActivityIndicator size="large" color={palette.primary} />
      ) : (
        <>
          <Text style={styles.accessTitle}>নোটিফিকেশন অ্যাক্সেস প্রয়োজন</Text>
          <Text style={styles.accessMessage}>
            আপনার লেনদেন ট্র্যাক করার জন্য এই এপ এর নোটিফিকেশন এক্সেস প্রয়োজন
          </Text>
          {!!error && <Text style={styles.accessError}>{error}</Text>}
          <Pressable style={styles.accessButton} onPress={() => openNotificationAccessSettings().catch(() => setError('নোটিফিকেশন সেটিংস খোলা যায়নি।'))} accessibilityRole="button">
            <Text style={styles.accessButtonText}>সেটিংস খুলুন</Text>
          </Pressable>
          <Pressable onPress={() => hasNotificationAccess().then(setAccess).catch(() => setAccess(false))} accessibilityRole="button">
            <Text style={styles.accessRetry}>আবার যাচাই করুন</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function RootNavigator() {
  const { isAuthenticated, isReady } = useAuth();
  const unlocked = Platform.OS !== 'web' && isReady && isAuthenticated;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!unlocked}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={unlocked}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="send-money" />
      <Stack.Screen name="bank-transfer" />
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
      <Stack.Screen name="provider-actions" />
      </Stack.Protected>
      <Stack.Screen name="support" />
      <Stack.Screen name="admin-login" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="admin-requests" />
      <Stack.Screen name="admin-users" />
      <Stack.Screen name="admin-user-profile" />
    </Stack>
  );
}

function NotificationSync() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sync = () => {
      const uid = auth.currentUser?.uid;
      setNotificationOwner(uid ?? null).catch((error) => console.warn('Notification owner update failed', error));
      if (uid) syncCapturedNotifications(uid).catch((error) => console.warn('Notification sync failed', error));
    };
    sync();
    const authSubscription = auth.onAuthStateChanged(sync);
    const appSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    const timer = setInterval(() => { if (AppState.currentState === 'active') sync(); }, 10000);
    return () => {
      clearInterval(timer);
      authSubscription();
      appSubscription.remove();
    };
  }, []);
  return null;
}

function AuthenticatedUpdatePrompt() {
  const { isReady, isAuthenticated } = useAuth();
  return isReady && isAuthenticated ? <AppUpdatePrompt /> : null;
}

const styles = StyleSheet.create({
  accessGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: palette.background,
  },
  accessTitle: { color: palette.ink, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  accessMessage: { color: palette.muted, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 12 },
  accessError: { color: palette.danger, textAlign: 'center', marginTop: 12 },
  accessButton: { backgroundColor: palette.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 24 },
  accessButtonText: { color: '#fff', fontWeight: '700' },
  accessRetry: { color: palette.primary, marginTop: 20, fontWeight: '600' },
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
});

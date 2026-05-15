import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';

import '@/i18n';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default React.memo(function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
});

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const isPublicRoute = segments[0] === 'login' || segments[0] === 'support';

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && segments[0] === 'login') {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isReady, router, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="support" />
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
    </Stack>
  );
}

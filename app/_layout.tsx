import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import '@/i18n';
import { AppUpdatePrompt } from '@/components/AppUpdatePrompt';
import { palette } from '@/constants/toppay';
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
        <View style={styles.webCanvas}>
          <View style={styles.appShell}>
            <RootNavigator />
            <AppUpdatePrompt />
          </View>
        </View>
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
      <Stack.Screen name="payment-methods" />
    </Stack>
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
      shadowColor: '#0E1B16',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.12,
      shadowRadius: 38,
    } : null),
  },
});

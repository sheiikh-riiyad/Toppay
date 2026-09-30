import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AppUpdatePrompt } from '@/components/AppUpdatePrompt';
import { palette } from '@/constants/toppay';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import '@/i18n';

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
          </View>
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
});

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
      <Stack.Screen name="admin-users" />
      <Stack.Screen name="admin-user-profile" />
    </Stack>
  );
}

function AuthenticatedUpdatePrompt() {
  const { isReady, isAuthenticated } = useAuth();
  return isReady && isAuthenticated ? <AppUpdatePrompt /> : null;
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
});

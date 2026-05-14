import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LanguageToggle from '@/components/LanguageToggle';
import { palette } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'backspace'],
];

const missingGoogleClientId = 'missing-google-client-id.apps.googleusercontent.com';
const fallbackGoogleWebClientId = '372853268456-0h5cr7jqn2fef87r3odfkbv8ejgjo0n6.apps.googleusercontent.com';
const fallbackGoogleAndroidClientId = '372853268456-e4slijlgespqdjv360m892pl4c8m4v4r.apps.googleusercontent.com';

function resolveGoogleClientId(clientId?: string) {
  const normalizedClientId = clientId?.trim() ?? '';

  if (
    !normalizedClientId ||
    normalizedClientId === missingGoogleClientId ||
    normalizedClientId.startsWith('your-') ||
    normalizedClientId.includes('placeholder') ||
    !normalizedClientId.endsWith('.apps.googleusercontent.com')
  ) {
    return missingGoogleClientId;
  }

  return normalizedClientId;
}

const googleWebClientId = resolveGoogleClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || fallbackGoogleWebClientId);
const googleIosClientId = resolveGoogleClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
const googleAndroidClientId = resolveGoogleClientId(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || fallbackGoogleAndroidClientId);
const isExpoGo = Constants.appOwnership === 'expo';

function waitForLoadingFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 80);
    });
  });
}

if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: googleWebClientId,
    offlineAccess: false,
  });
}

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    account,
    connectGoogleAccount,
    hasAccount,
    isReady,
    loginWithPin,
    pendingGoogleAccount,
    resetAccount,
    signInForDevelopment,
    setupWithGoogle,
  } = useAuth();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [activeSetupField, setActiveSetupField] = useState<'pin' | 'confirm'>('pin');
  const [error, setError] = useState('');
  const setupPinComplete = pin.length === 4 && confirmPin.length === 4 && pin === confirmPin;
  const setupMismatch = confirmPin.length === 4 && pin !== confirmPin;
  const hasNativeGoogleClientId = Platform.select({
    android: googleAndroidClientId !== missingGoogleClientId,
    ios: googleIosClientId !== missingGoogleClientId,
    default: true,
  });
  const canUseDevelopmentLogin = __DEV__ && isExpoGo && Platform.OS !== 'web';
  const isLoginBusy = isConnectingGoogle || isCreatingWallet;
  const loadingMessage = isConnectingGoogle
    ? t('login.signingIn')
    : hasAccount
      ? t('login.unlocking')
      : t('login.creatingWalletProgress');

  function pushHome() {
    router.replace('/(tabs)');
  }

  async function handleLogin() {
    setError('');
    setIsCreatingWallet(true);

    try {
      await waitForLoadingFrame();
      const success = await loginWithPin(pin);

      if (success) {
        pushHome();
        return;
      }

      setPin('');
      setError(t('login.invalidPin'));
    } finally {
      setIsCreatingWallet(false);
    }
  }

  async function handleGoogleConnect() {
    setError('');
    setIsConnectingGoogle(true);

    try {
      if (Platform.OS !== 'web') {
        await waitForLoadingFrame();
      }

      if (Platform.OS === 'web') {
        await connectGoogleAccount();
      } else {
        if (isExpoGo) {
          throw new Error('expo-go-google-unsupported');
        }

        if (!hasNativeGoogleClientId) {
          throw new Error('missing-client-id');
        }

        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }

        const result = await GoogleSignin.signIn();

        if (result.type !== 'success') {
          throw new Error('cancelled');
        }

        const idToken = result.data.idToken;

        if (!idToken) {
          throw new Error('missing-id-token');
        }

        await connectGoogleAccount(idToken);
      }

      setGoogleConnected(true);
    } catch (googleError) {
      const messageKey = googleError instanceof Error && googleError.message === 'missing-client-id'
        ? 'login.missingGoogleClientId'
        : googleError instanceof Error && googleError.message === 'expo-go-google-unsupported'
          ? 'login.expoGoGoogleUnsupported'
          : 'login.googleFailed';

      setError(t(messageKey));
    } finally {
      setIsConnectingGoogle(false);
    }
  }

  function handleDevelopmentLogin() {
    setError('');
    signInForDevelopment();
    pushHome();
  }

  async function handleSetup() {
    if (!setupPinComplete) {
      setError(t(setupMismatch ? 'login.pinMismatch' : 'login.pinRequired'));
      return;
    }

    setIsCreatingWallet(true);

    try {
      await waitForLoadingFrame();
      await setupWithGoogle(pin);
      pushHome();
    } catch {
      setError(t('login.createFailed'));
    } finally {
      setIsCreatingWallet(false);
    }
  }

  function handleDigit(value: string) {
    setError('');

    if (hasAccount) {
      setPin((current) => (current.length < 4 ? `${current}${value}` : current));
      return;
    }

    if (activeSetupField === 'pin') {
      setPin((current) => {
        if (current.length >= 4) {
          return current;
        }

        const next = `${current}${value}`;
        if (next.length === 4) {
          setActiveSetupField('confirm');
        }
        return next;
      });
      return;
    }

    setConfirmPin((current) => (current.length < 4 ? `${current}${value}` : current));
  }

  function handleBackspace() {
    setError('');

    if (hasAccount) {
      setPin((current) => current.slice(0, -1));
      return;
    }

    if (activeSetupField === 'confirm') {
      setConfirmPin((current) => {
        if (current.length > 0) {
          return current.slice(0, -1);
        }

        setActiveSetupField('pin');
        return current;
      });
      return;
    }

    setPin((current) => current.slice(0, -1));
  }

  function handleClear() {
    setError('');
    setPin('');
    setConfirmPin('');
    setActiveSetupField('pin');
  }

  if (!isReady) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandBlock}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>T</Text>
          </View>
          <Text style={styles.brandName}>Toppay</Text>
          <Text style={styles.brandMeta}>
            {hasAccount ? t('login.pinSubtitle') : t('login.googleSubtitle')}
          </Text>
        </View>

        <LanguageToggle />

        {hasAccount ? (
          <View style={styles.panel}>
            <View style={styles.accountRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{account?.initials ?? 'TP'}</Text>
              </View>
              <View style={styles.accountCopy}>
                <Text style={styles.accountName}>{account?.name}</Text>
                <Text style={styles.accountEmail}>{account?.email}</Text>
              </View>
              <MaterialIcons name="verified-user" size={20} color={palette.primary} />
            </View>

            <Text style={styles.panelTitle}>{t('login.enterPin')}</Text>
            <PinDots value={pin} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Keypad onBackspace={handleBackspace} onClear={handleClear} onDigit={handleDigit} />

            <Pressable
              style={[styles.primaryButton, (pin.length !== 4 || isCreatingWallet) && styles.primaryButtonDisabled]}
              disabled={pin.length !== 4 || isCreatingWallet}
              onPress={handleLogin}
              accessibilityRole="button">
              <MaterialIcons name="lock-open" size={18} color={palette.surface} />
              <Text style={styles.primaryButtonText}>
                {isCreatingWallet ? t('common.loading') : t('login.unlock')}
              </Text>
            </Pressable>

            <Pressable
              style={styles.linkButton}
              disabled={isLoginBusy}
              onPress={() => void resetAccount()}
              accessibilityRole="button">
              <Text style={styles.linkButtonText}>{t('login.useAnotherAccount')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.panel}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                {googleConnected ? t('login.stepTwo') : t('login.stepOne')}
              </Text>
            </View>

            {!googleConnected ? (
              <>
                <Text style={styles.panelTitle}>{t('login.createTitle')}</Text>
                <Text style={styles.panelMeta}>{t('login.createMeta')}</Text>
                <Pressable
                  style={[styles.googleButton, isConnectingGoogle && styles.googleButtonDisabled]}
                  disabled={isConnectingGoogle}
                  onPress={handleGoogleConnect}
                  accessibilityRole="button">
                  <View style={styles.googleMark}>
                    <Text style={styles.googleMarkText}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>
                    {isConnectingGoogle ? t('common.loading') : t('login.continueGoogle')}
                  </Text>
                </Pressable>
                {canUseDevelopmentLogin ? (
                  <Pressable
                    style={[styles.developmentButton, isLoginBusy && styles.developmentButtonDisabled]}
                    disabled={isLoginBusy}
                    onPress={handleDevelopmentLogin}
                    accessibilityRole="button">
                    <MaterialIcons name="code" size={18} color={palette.primary} />
                    <Text style={styles.developmentButtonText}>{t('login.continueDevelopment')}</Text>
                  </Pressable>
                ) : null}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </>
            ) : (
              <>
                <View style={styles.accountRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{pendingGoogleAccount?.initials ?? 'TP'}</Text>
                  </View>
                  <View style={styles.accountCopy}>
                    <Text style={styles.accountName}>{pendingGoogleAccount?.name}</Text>
                    <Text style={styles.accountEmail}>{pendingGoogleAccount?.email}</Text>
                  </View>
                  <MaterialIcons name="check-circle" size={20} color={palette.primary} />
                </View>

                <Text style={styles.panelTitle}>{t('login.setupPinTitle')}</Text>
                <Text style={styles.panelMeta}>{t('login.setupPinMeta')}</Text>

                <Pressable
                  style={[styles.pinInputPanel, activeSetupField === 'pin' && styles.pinInputPanelActive]}
                  onPress={() => setActiveSetupField('pin')}
                  accessibilityRole="button">
                  <Text style={styles.pinInputLabel}>{t('login.newPin')}</Text>
                  <PinDots value={pin} compact />
                </Pressable>

                <Pressable
                  style={[styles.pinInputPanel, activeSetupField === 'confirm' && styles.pinInputPanelActive]}
                  onPress={() => setActiveSetupField('confirm')}
                  accessibilityRole="button">
                  <Text style={styles.pinInputLabel}>{t('login.confirmPin')}</Text>
                  <PinDots value={confirmPin} compact />
                </Pressable>

                {setupMismatch ? <Text style={styles.errorText}>{t('login.pinMismatch')}</Text> : null}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Keypad onBackspace={handleBackspace} onClear={handleClear} onDigit={handleDigit} />

                <Pressable
                  style={[styles.primaryButton, (!setupPinComplete || isCreatingWallet) && styles.primaryButtonDisabled]}
                  disabled={!setupPinComplete || isCreatingWallet}
                  onPress={handleSetup}
                  accessibilityRole="button">
                  <MaterialIcons name="account-circle" size={18} color={palette.surface} />
                  <Text style={styles.primaryButtonText}>
                    {isCreatingWallet ? t('common.loading') : t('login.createWallet')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={styles.securityNote}>
          <MaterialIcons name="security" size={19} color={palette.primary} />
          <Text style={styles.securityText}>{t('login.securityNote')}</Text>
        </View>
      </ScrollView>

      {isLoginBusy ? (
        <LoginProgressOverlay message={loadingMessage} detail={t('login.pleaseWait')} />
      ) : null}
    </SafeAreaView>
  );
}

function LoginProgressOverlay({ detail, message }: { detail: string; message: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1050,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-132, 228],
  });

  return (
    <View style={styles.progressOverlay} pointerEvents="auto">
      <View style={styles.progressPanel}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.progressTitle}>{message}</Text>
        <Text style={styles.progressMeta}>{detail}</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { transform: [{ translateX }] }]} />
        </View>
      </View>
    </View>
  );
}

function PinDots({ compact, value }: { compact?: boolean; value: string }) {
  return (
    <View style={[styles.pinDots, compact && styles.pinDotsCompact]}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[
            styles.pinDot,
            compact && styles.pinDotCompact,
            index < value.length && styles.pinDotFilled,
          ]}
        />
      ))}
    </View>
  );
}

function Keypad({
  onBackspace,
  onClear,
  onDigit,
}: {
  onBackspace: () => void;
  onClear: () => void;
  onDigit: (value: string) => void;
}) {
  return (
    <View style={styles.keypad}>
      {keypadRows.map((row) => (
        <View key={row.join('-')} style={styles.keypadRow}>
          {row.map((item) => {
            const isBackspace = item === 'backspace';
            const isClear = item === 'clear';

            return (
              <Pressable
                key={item}
                style={({ pressed }) => [styles.keyButton, pressed && styles.keyButtonPressed]}
                onPress={isBackspace ? onBackspace : isClear ? onClear : () => onDigit(item)}
                accessibilityRole="button">
                {isBackspace ? (
                  <MaterialIcons name="backspace" size={22} color={palette.ink} />
                ) : (
                  <Text style={[styles.keyText, isClear && styles.clearText]}>
                    {isClear ? 'C' : item}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: palette.muted,
    fontSize: 15,
    fontWeight: '800',
  },
  brandBlock: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 4,
  },
  logoMark: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  logoLetter: {
    color: palette.surface,
    fontSize: 36,
    fontWeight: '900',
  },
  brandName: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 12,
  },
  brandMeta: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 16,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: palette.softGreen,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepBadgeText: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  panelTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  panelMeta: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  googleButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  googleButtonDisabled: {
    opacity: 0.65,
  },
  googleMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F5F2',
  },
  googleMarkText: {
    color: palette.coral,
    fontSize: 18,
    fontWeight: '900',
  },
  googleButtonText: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  developmentButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.softGreen,
  },
  developmentButtonText: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  developmentButtonDisabled: {
    opacity: 0.55,
  },
  accountRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    backgroundColor: palette.surfaceAlt,
    padding: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  avatarText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  accountCopy: {
    flex: 1,
  },
  accountName: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  accountEmail: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  pinDots: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  pinDotsCompact: {
    height: 26,
    justifyContent: 'flex-end',
    gap: 8,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: palette.primary,
  },
  pinDotCompact: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pinDotFilled: {
    backgroundColor: palette.primary,
  },
  pinInputPanel: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
  },
  pinInputPanelActive: {
    borderColor: palette.primary,
    backgroundColor: palette.softGreen,
  },
  pinInputLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  keypad: {
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keyButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F7F9F6',
    borderWidth: 1,
    borderColor: palette.border,
  },
  keyButtonPressed: {
    backgroundColor: palette.softGreen,
  },
  keyText: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  clearText: {
    color: palette.danger,
    fontSize: 15,
  },
  primaryButton: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: palette.primary,
  },
  primaryButtonDisabled: {
    backgroundColor: '#A8B7B0',
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkButtonText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 8,
    backgroundColor: palette.softGreen,
    padding: 14,
  },
  securityText: {
    flex: 1,
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(246, 249, 246, 0.82)',
    padding: 24,
  },
  progressPanel: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 22,
    gap: 10,
  },
  progressTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  progressMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: '#E5ECE7',
    marginTop: 4,
  },
  progressFill: {
    width: '62%',
    height: '100%',
    borderRadius: 3,
    backgroundColor: palette.primary,
  },
});

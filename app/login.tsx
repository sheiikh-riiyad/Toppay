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
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppLogo from '@/components/AppLogo';
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
  const { t, i18n } = useTranslation();
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
  const [isRestoring, setIsRestoring] = useState(true);
  useEffect(() => {
    if (!isReady) return;
    // Give the restored-account transition a brief, visible loading state.
    const timer = setTimeout(() => setIsRestoring(false), hasAccount ? 650 : 0);
    return () => clearTimeout(timer);
  }, [isReady, hasAccount]);

  useEffect(() => {
    if (isReady && pendingGoogleAccount && !hasAccount) setGoogleConnected(true);
  }, [isReady, pendingGoogleAccount, hasAccount]);
  const setupPinComplete = pin.length === 4 && confirmPin.length === 4 && pin === confirmPin;
  const setupMismatch = confirmPin.length === 4 && pin !== confirmPin;
  const hasNativeGoogleClientId = Platform.select({
    android: googleAndroidClientId !== missingGoogleClientId,
    ios: googleIosClientId !== missingGoogleClientId,
    default: true,
  });
  const canUseDevelopmentLogin = __DEV__ && isExpoGo && Platform.OS !== 'web';
  const isCheckingAccount = !isReady || isRestoring;
  const isLoginBusy = isCheckingAccount || isConnectingGoogle || isCreatingWallet;
  const loadingMessage = isCheckingAccount ? t('login.restoringAccount') : isConnectingGoogle
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
      const result = await loginWithPin(pin);

      if (result.ok) {
        pushHome();
        return;
      }

      setPin('');
      if (result.reason === 'blocked') {
        router.replace({
          pathname: '/support',
          params: {
            reason: 'pin-blocked',
          },
        });
        return;
      }

      if (result.reason === 'invalid') {
        setError(t('securityPin.invalidPinWithAttempts', {
          attempts: result.remainingAttempts ?? 0,
        }));
        return;
      }

      setError(t(result.reason === 'verify-failed' ? 'securityPin.verifyFailed' : 'login.invalidPin'));
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
      console.error('Google sign-in failed:', googleError);
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

  const nextDisabled = isLoginBusy || (hasAccount ? pin.length !== 4 : googleConnected ? !setupPinComplete : false);
  const nextAction = hasAccount ? handleLogin : googleConnected ? handleSetup : handleGoogleConnect;

  function handleBack() {
    if (googleConnected && !hasAccount) {
      setGoogleConnected(false);
      handleClear();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/support');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} disabled={isLoginBusy} style={styles.backButton}
          accessibilityRole="button" accessibilityLabel={router.canGoBack() || googleConnected ? t('common.back') : t('common.help')}>
          <MaterialIcons name={router.canGoBack() || googleConnected ? 'arrow-back' : 'help-outline'} size={26} color={palette.primary} />
        </Pressable>
        <Pressable style={styles.languageButton} disabled={isLoginBusy}
          onPress={() => void i18n.changeLanguage(i18n.language.startsWith('bn') ? 'en' : 'bn')}
          accessibilityRole="button" accessibilityLabel={t('common.switchLanguage')}>
          <Text style={styles.languageText}>{i18n.language.startsWith('bn') ? 'English' : t('common.bangla')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandBlock}>
          <AppLogo size={58} />
          <Text style={styles.heading}>
            {hasAccount ? t('login.simplePinTitle') : googleConnected ? t('login.setupPinTitle') : t('login.simpleTitle')}
          </Text>
        </View>

        <View style={styles.form}>
          {hasAccount || googleConnected ? (
            <>
              <Text style={styles.fieldLabel}>{t('login.googleAccountLabel')}</Text>
              <View style={styles.accountRow}>
                <MaterialIcons name="account-circle" size={25} color={palette.primary} />
                <View style={styles.accountCopy}>
                  <Text style={styles.accountName}>{(hasAccount ? account : pendingGoogleAccount)?.name}</Text>
                  <Text style={styles.accountEmail}>{(hasAccount ? account : pendingGoogleAccount)?.email}</Text>
                </View>
              </View>
              {hasAccount ? (
                <>
                  <Text style={styles.fieldLabel}>{t('login.enterPin')}</Text>
                  <PinDots value={pin} />
                </>
              ) : (
                <>
                  <Text style={styles.helperText}>{t('login.setupPinMeta')}</Text>
                  <Pressable style={[styles.pinInputPanel, activeSetupField === 'pin' && styles.pinInputPanelActive]}
                    onPress={() => setActiveSetupField('pin')} disabled={isLoginBusy} accessibilityRole="button"
                    accessibilityLabel={t('login.newPin')}>
                    <Text style={styles.fieldLabel}>{t('login.newPin')}</Text>
                    <PinDots value={pin} compact />
                  </Pressable>
                  <Pressable style={[styles.pinInputPanel, activeSetupField === 'confirm' && styles.pinInputPanelActive]}
                    onPress={() => setActiveSetupField('confirm')} disabled={isLoginBusy} accessibilityRole="button"
                    accessibilityLabel={t('login.confirmPin')}>
                    <Text style={styles.fieldLabel}>{t('login.confirmPin')}</Text>
                    <PinDots value={confirmPin} compact />
                  </Pressable>
                  {setupMismatch ? <Text accessibilityRole="alert" style={styles.errorText}>{t('login.pinMismatch')}</Text> : null}
                </>
              )}
              <Keypad onBackspace={handleBackspace} onClear={handleClear} onDigit={handleDigit} />
              {hasAccount ? (
                <Pressable style={styles.textButton} disabled={isLoginBusy}
                  onPress={() => { handleClear(); setGoogleConnected(false); void resetAccount(); }} accessibilityRole="button">
                  <Text style={styles.linkText}>{t('login.useAnotherAccount')}</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>{t('login.googleAccountLabel')}</Text>
              <Pressable
                style={({ pressed }) => [styles.signInRow, pressed && styles.signInRowPressed]}
                onPress={handleGoogleConnect}
                disabled={isLoginBusy}
                accessibilityRole="button"
                accessibilityLabel={t('login.continueGoogle')}
                accessibilityState={{ disabled: isLoginBusy, busy: isConnectingGoogle }}>
                <MaterialIcons name="account-circle" size={26} color={palette.primary} />
                <Text style={styles.signInText}>{t('login.continueGoogle')}</Text>
              </Pressable>
              <Text style={styles.helperText}>{t('login.simpleGoogleHint')}</Text>
              {canUseDevelopmentLogin ? (
                <Pressable style={styles.textButton} disabled={isLoginBusy} onPress={handleDevelopmentLogin} accessibilityRole="button">
                  <Text style={styles.linkText}>{t('login.continueDevelopment')}</Text>
                </Pressable>
              ) : null}
            </>
          )}
          {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
          {!hasAccount ? <Pressable style={styles.textButton} disabled={isLoginBusy} onPress={() => router.push('/support')} accessibilityRole="button">
            <Text style={styles.supportText}>{t('login.needSupport')}</Text>
          </Pressable> : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {hasAccount ? (
          <Pressable style={styles.pinSupportButton} disabled={isLoginBusy} onPress={() => router.push('/support')} accessibilityRole="button">
            <MaterialIcons name="support-agent" size={21} color={palette.primary} />
            <Text style={styles.languageText}>{t('login.needSupport')}</Text>
          </Pressable>
        ) : null}
        <View style={styles.stepTrack}>
          <View style={[styles.stepFill, { width: hasAccount || googleConnected ? '66%' : '20%' }]}>
            <View style={styles.stepDot} />
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.nextButton, nextDisabled && styles.nextButtonDisabled, pressed && !nextDisabled && styles.nextButtonPressed]}
          disabled={nextDisabled} onPress={nextAction} accessibilityRole="button" accessibilityState={{ disabled: nextDisabled, busy: isLoginBusy }}>
          <Text style={styles.nextText}>{isLoginBusy ? t('common.loading') : t('common.next')}</Text>
          <MaterialIcons name="arrow-forward" size={27} color="#FFFFFF" />
        </Pressable>
      </View>
      {isLoginBusy ? <LoginProgressOverlay message={loadingMessage} detail={t(isCheckingAccount ? 'login.restoreHint' : 'login.pleaseWait')} /> : null}
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
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
    <View style={styles.progressOverlay}>
      <View style={styles.progressPanel} accessibilityViewIsModal accessibilityRole="progressbar" accessibilityLabel={message}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.progressTitle}>{message}</Text>
        <Text style={styles.progressMeta}>{detail}</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { transform: [{ translateX }] }]} />
        </View>
      </View>
    </View>
    </Modal>
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
  pinSupportButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  screen: { flex: 1, backgroundColor: '#FAFAFA' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, minHeight: 48 },
  backButton: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  languageButton: { borderWidth: 1, borderColor: palette.primary, borderRadius: 24, paddingHorizontal: 16, minHeight: 36, justifyContent: 'center' },
  languageText: { color: palette.primary, fontSize: 15 },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 40, paddingBottom: 28 },
  brandBlock: { alignItems: 'flex-start', marginBottom: 26, gap: 22 },
  heading: { color: '#505050', fontSize: 27, lineHeight: 37, fontWeight: '500' },
  form: { gap: 16 },
  fieldLabel: { color: '#666666', fontSize: 15 },
  signInRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 58, backgroundColor: '#F3F3F3', paddingHorizontal: 14 },
  signInRowPressed: { backgroundColor: palette.softPrimary },
  signInText: { color: '#555555', fontSize: 17, flexShrink: 1 },
  helperText: { color: '#777777', fontSize: 14, lineHeight: 22 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  accountCopy: { flex: 1 },
  accountName: { color: '#555555', fontSize: 16 },
  accountEmail: { color: '#777777', fontSize: 13, marginTop: 4 },
  textButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  linkText: { color: palette.primary, fontSize: 14 },
  supportText: { color: palette.primary, fontSize: 13, textDecorationLine: 'underline' },
  footer: { paddingTop: 6 },
  stepTrack: { height: 3, backgroundColor: '#D8D8D8', marginBottom: 8 },
  stepFill: { height: 3, backgroundColor: '#F65B99', justifyContent: 'center', alignItems: 'flex-end' },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F65B99' },
  nextButton: { minHeight: 54, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: palette.primary },
  nextButtonDisabled: { backgroundColor: '#A5A5A5' },
  nextButtonPressed: { backgroundColor: palette.primaryDark },
  nextText: { color: '#FFFFFF', fontSize: 19, fontWeight: '500' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: palette.muted, fontSize: 15 },
  pinDots: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 18 },
  pinDotsCompact: { height: 26, gap: 12 },
  pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#AAAAAA' },
  pinDotCompact: { width: 10, height: 10, borderRadius: 5 },
  pinDotFilled: { backgroundColor: palette.primary, borderColor: palette.primary },
  pinInputPanel: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#DDDDDD', gap: 12 },
  pinInputPanelActive: { borderBottomColor: palette.primary },
  keypad: { gap: 4 },
  keypadRow: { flexDirection: 'row', gap: 8 },
  keyButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  keyButtonPressed: { backgroundColor: palette.softPrimary },
  keyText: { color: '#555555', fontSize: 24, fontWeight: '400' },
  clearText: { color: palette.primary, fontSize: 16 },
  errorText: { color: palette.danger, fontSize: 13, lineHeight: 20 },
  progressOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(48,28,38,0.35)', padding: 24 },
  progressPanel: { width: '100%', maxWidth: 320, alignItems: 'center', padding: 26, gap: 16, borderRadius: 20, backgroundColor: '#FFFFFF' },
  progressTitle: { color: '#555555', fontSize: 17, textAlign: 'center' },
  progressMeta: { color: '#777777', fontSize: 13, textAlign: 'center' },
  progressTrack: { width: '100%', height: 3, overflow: 'hidden', backgroundColor: '#E5E5E5', marginTop: 8 },
  progressFill: { width: '62%', height: '100%', backgroundColor: palette.primary },
});

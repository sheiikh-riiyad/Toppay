import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth';
import { useSecureActionPin } from '@/hooks/use-secure-action-pin';
import { useWalletData } from '@/hooks/use-wallet-data';
import { formatCurrency, mobileRechargeProviders, palette } from '@/constants/toppay';
import { createMobileRechargeRequest } from '@/services/wallet';

function makeLocalRequestId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export default function MobileRechargeConfirmationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const verifySecureActionPin = useSecureActionPin();
  const { summary } = useWalletData(account?.uid);
  const params = useLocalSearchParams();

  const receiverName = params.receiverName as string;
  const receiverPhone = params.receiverPhone as string;
  const providerName = params.provider as string;
  const amount = params.amount as string;

  const [pin, setPin] = useState('');
  const [pressProgress, setPressProgress] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const pressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressActiveRef = useRef(false);
  const submitLockRef = useRef(false);
  const requestIdRef = useRef(makeLocalRequestId('RECH'));

  const numericAmount = Number(amount) || 0;
  const balance = summary?.balance ?? 0;
  const remainingBalance = Math.max(balance - numericAmount, 0);
  const provider = mobileRechargeProviders.find((item) => item.name === providerName);
  const canConfirm = pin.length === 4 && !isSubmitting;

  useEffect(() => () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
    }
  }, []);

  function handlePressIn() {
    if (!canConfirm || pressActiveRef.current || submitLockRef.current) {
      return;
    }

    pressActiveRef.current = true;
    setIsConfirming(true);
    let progress = 0;

    pressTimerRef.current = setInterval(() => {
      progress += 2;
      setPressProgress(progress);

      if (progress >= 100) {
        clearInterval(pressTimerRef.current!);
        pressTimerRef.current = null;
        pressActiveRef.current = false;
        setIsConfirming(false);
        setPressProgress(100);
        void handleConfirmation();
      }
    }, 20);
  }

  function handlePressOut() {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    pressActiveRef.current = false;

    if (submitLockRef.current) {
      return;
    }

    setIsConfirming(false);
    setPressProgress(0);
  }

  async function handleConfirmation() {
    if (submitLockRef.current) {
      return;
    }

    if (!account) {
      setSubmitError(t('login.googleFailed'));
      return;
    }

    const pinVerification = await verifySecureActionPin(pin);
    if (!pinVerification.ok) {
      setPin('');
      setPressProgress(0);
      setSubmitError(pinVerification.message);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const transaction = await createMobileRechargeRequest({
        uid: account.uid,
        requestId: requestIdRef.current,
        provider: providerName,
        receiverName,
        receiverPhone,
        amount: numericAmount,
      });

      router.replace({
        pathname: '/mobile-recharge-submitted',
        params: {
          requestId: transaction.requestId,
          receiverName,
          receiverPhone,
          provider: providerName,
          amount,
        },
      });
    } catch {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setPressProgress(0);
      setSubmitError(t('mobileRechargePage.submitFailed'));
    }
  }

  function handlePinChange(text: string) {
    if (text.length <= 4 && /^\d*$/.test(text)) {
      setPin(text);
      setSubmitError('');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('mobileRechargePage.confirmKicker')}</Text>
            <Text style={styles.title}>{t('mobileRechargePage.confirmTitle')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="verified-user" size={17} color={palette.cyan} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="phone-android" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('mobileRechargePage.reviewConfirm')}</Text>
            <Text style={styles.heroMeta}>{t('mobileRechargePage.checkDetails')}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow label={t('generic.recipient')} value={receiverName} />
          <DetailDivider />
          <DetailRow label={t('generic.phoneNumber')} value={receiverPhone} />
          <DetailDivider />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('mobileRechargePage.provider')}</Text>
            <View style={styles.providerBadge}>
              {provider ? (
                <>
                  <View style={[styles.providerBadgeMark, { backgroundColor: provider.color }]}>
                    <Text style={styles.providerBadgeMarkText}>{provider.mark}</Text>
                  </View>
                  <Text style={styles.providerBadgeText}>{provider.name}</Text>
                </>
              ) : (
                <Text style={styles.detailValue}>{providerName}</Text>
              )}
            </View>
          </View>
          <DetailDivider />
          <DetailRow label={t('generic.amount')} value={formatCurrency(numericAmount)} />
          <DetailDivider />
          <DetailRow
            label={t('generic.remainingBalance')}
            value={formatCurrency(remainingBalance)}
            strong
          />
        </View>

        <View style={styles.pinPanel}>
          <Text style={styles.pinPanelTitle}>{t('mobileRechargePage.enterPin')}</Text>
          <View style={styles.pinInputContainer}>
            <TextInput
              value={pin}
              onChangeText={handlePinChange}
              placeholder="0000"
              placeholderTextColor={palette.muted}
              keyboardType="numeric"
              secureTextEntry={true}
              maxLength={4}
              style={styles.pinInput}
              editable={!isSubmitting}
            />
            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    index < pin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.confirmPanel}>
          <Text style={styles.confirmPanelTitle}>{t('generic.pressHoldConfirm')}</Text>
          <Pressable
            style={[
              styles.confirmButton,
              !canConfirm && styles.confirmButtonDisabled,
              isConfirming && styles.confirmButtonActive,
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!canConfirm}
            accessibilityRole="button">
            <View
              style={[
                styles.confirmProgressBar,
                {
                  width: `${pressProgress}%`,
                },
              ]}
            />
            <View style={styles.confirmButtonContent}>
              <MaterialIcons name="lock" size={20} color={palette.surface} />
              <Text style={styles.confirmButtonText}>
                {isSubmitting
                  ? t('common.loading')
                  : pressProgress > 0
                    ? `${Math.round(pressProgress)}%`
                    : t('generic.holdToConfirm')}
              </Text>
            </View>
          </Pressable>
          {pin.length !== 4 ? (
            <Text style={styles.pinWarning}>{t('mobileRechargePage.pinWarning')}</Text>
          ) : null}
          {submitError ? <Text style={styles.pinWarning}>{submitError}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, strong && styles.detailValueStrong]}>{value}</Text>
    </View>
  );
}

function DetailDivider() {
  return <View style={styles.detailDivider} />;
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    color: palette.cyan,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.ink,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 2,
  },
  secureBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softCyan,
  },
  heroCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.cyan,
    borderRadius: 8,
    padding: 15,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: palette.surface,
    fontSize: 18,
    fontWeight: '900',
  },
  heroMeta: {
    color: '#DDF7FB',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  detailsCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  detailRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  detailValueStrong: {
    color: palette.cyan,
    fontSize: 15,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flex: 1,
  },
  providerBadgeMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerBadgeMarkText: {
    color: palette.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  providerBadgeText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  pinPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
  },
  pinPanelTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  pinInputContainer: {
    minHeight: 58,
    justifyContent: 'center',
  },
  pinInput: {
    position: 'absolute',
    width: '100%',
    height: 58,
    opacity: 0,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  pinDotFilled: {
    borderColor: palette.cyan,
    backgroundColor: palette.cyan,
  },
  confirmPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
  },
  confirmPanelTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  confirmButton: {
    minHeight: 56,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: palette.cyan,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonActive: {
    transform: [{ scale: 0.99 }],
  },
  confirmProgressBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  confirmButtonContent: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  pinWarning: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '800',
  },
});

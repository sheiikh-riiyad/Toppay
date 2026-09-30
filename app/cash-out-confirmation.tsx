import TransactionStep from '@/components/TransactionStep';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth';
import { useSecureActionPin } from '@/hooks/use-secure-action-pin';
import { formatCurrency, palette } from '@/constants/toppay';
import { createCashOutRequest } from '@/services/wallet';

export default function CashOutConfirmationScreen() {
  const router = useRouter();
  const [reviewed, setReviewed] = useState(false);
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const providerSelected = params.providerSelected === '1';
  const { account } = useAuth();
  const verifySecureActionPin = useSecureActionPin();
  const [pin, setPin] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const pressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitLockRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Parse parameters from navigation
  const method = params.method as string;
  const receiverAccount = params.receiverAccount as string;
  const amount = Number(params.amount) || 0;
  const charge = Number(params.charge) || 0;
  const bonus = Number(params.bonus) || 0;
  const totalDebit = Number(params.totalDebit) || 0;
  const requestId = params.requestId as string;
  const note = params.note as string | undefined;

  useEffect(() => () => {
    if (pressTimeout.current) {
      clearTimeout(pressTimeout.current);
    }
  }, []);

  const handlePinChange = (text: string) => {
    // Only allow 4 digits
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numericText);
    setPinError(false);
    setSubmitError('');
  };

  const handlePressIn = () => {
    if (submitLockRef.current || isSubmitting || confirmed || pressTimeout.current) {
      return;
    }

    if (pin.length !== 4) {
      setPinError(true);
      return;
    }

    setIsPressing(true);
    progressAnim.setValue(0);

    // Animate progress over 1.5 seconds
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Button scale feedback
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    pressTimeout.current = setTimeout(() => {
      pressTimeout.current = null;
      setIsPressing(false);
      void confirmTransaction();
    }, 1500); // 1.5 seconds long press
  };

  const handlePressOut = () => {
    if (pressTimeout.current) {
      clearTimeout(pressTimeout.current);
      pressTimeout.current = null;
    }

    if (submitLockRef.current) {
      return;
    }

    setIsPressing(false);

    // Reset animations
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(buttonScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const confirmTransaction = async () => {
    if (submitLockRef.current) {
      return;
    }

    if (pin.length === 4) {
      if (!account) {
        setSubmitError(t('login.googleFailed'));
        return;
      }

      const pinVerification = await verifySecureActionPin(pin);
      if (!pinVerification.ok) {
        progressAnim.setValue(0);
        setPin('');
        setPinError(false);
        setSubmitError(pinVerification.message);
        return;
      }

      submitLockRef.current = true;
      setIsSubmitting(true);

      try {
        const transaction = await createCashOutRequest({
          uid: account.uid,
          requestId,
          method,
          receiverAccount,
          amount,
          charge,
          bonus,
          totalDebit,
          note,
        });

        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        setConfirmed(true);

        // Navigate to submitted page after 2 seconds
        setTimeout(() => {
          router.replace({
            pathname: '/cash-out-submitted',
            params: {
              requestId: transaction.requestId,
              method,
              amount: amount.toString(),
              charge: charge.toString(),
              bonus: bonus.toString(),
            },
          });
        }, 2000);
      } catch {
        submitLockRef.current = false;
        setIsSubmitting(false);
        setSubmitError(t('cashOutPage.submittedNote'));
      }
    }
  };

  if (confirmed) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.successContainer}>
          <Animated.View
            style={[
              styles.successIcon,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}>
            <MaterialIcons name="task-alt" size={64} color={palette.primary} />
          </Animated.View>
          <Text style={styles.successTitle}>{t('cashOutPage.confirmSuccessTitle')}</Text>
          <Text style={styles.successMeta}>{t('cashOutPage.confirmSuccessMeta')}</Text>
          <Text style={styles.successId}>রেফারেন্স: {requestId}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TransactionStep title={t(reviewed ? 'transactionSteps.pin' : 'transactionSteps.review')} step={reviewed ? (providerSelected ? 4 : 5) : (providerSelected ? 3 : 4)} total={providerSelected ? 4 : 5}
      busy={isSubmitting} onBack={() => { handlePressOut(); if (reviewed) { setReviewed(false); setPin(''); } else { router.back(); } }}
      onNext={() => setReviewed(true)}
      footer={reviewed ? (<>        <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
          <Pressable
            style={[
              styles.primaryButton,
              (pin.length !== 4 || isSubmitting) && styles.primaryButtonDisabled,
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={pin.length !== 4 || isSubmitting}
            accessibilityRole="button">
            {isPressing && (
              <Animated.View
                style={[
                  styles.progressOverlay,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            )}
            <View style={styles.buttonContent}>
              <MaterialIcons name="verified-user" size={20} color={palette.surface} />
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? t('common.loading') : t('generic.longPressToConfirm')}
              </Text>
            </View>
          </Pressable>
        </Animated.View>

</>) : undefined}>
      {!reviewed ? (<>        <View style={styles.summaryCard}>
          <Text style={styles.panelTitle}>{t('generic.transactionSummary')}</Text>
          <View style={styles.summaryDivider} />

          <SummaryRow label={t('generic.method')} value={method} />
          <SummaryRow label={t('generic.receiver')} value={receiverAccount} />
          <View style={styles.summaryDivider} />
          <SummaryRow label={t('generic.cashOut')} value={formatCurrency(amount)} />
          <SummaryRow label={t('generic.serviceCharge')} value={formatCurrency(charge)} />
          <SummaryRow label={t('generic.bonus')} value={formatCurrency(bonus)} strong />
          <View style={styles.summaryDivider} />
          <SummaryRow label={t('generic.totalDebit')} value={formatCurrency(totalDebit)} strong />
        </View>


</>) : (<>
        <Text style={styles.compactAmount}>{formatCurrency(totalDebit)}</Text>
                <View style={styles.pinPanel}>
          <Text style={styles.pinLabel}>{t('cashOutPage.enterPin')}</Text>
          <View style={styles.pinInputContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  index < pin.length && styles.pinDotFilled,
                  pinError && styles.pinDotError,
                ]}>
                {index < pin.length && <View style={styles.pinDotInner} />}
              </View>
            ))}
          </View>
          <TextInput
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry={true}
            placeholder="0000"
            placeholderTextColor={palette.muted}
            style={styles.pinInput}
            editable={!confirmed && !isSubmitting}
          />
          {pinError && (
            <View style={styles.errorMessage}>
              <MaterialIcons name="error" size={16} color={palette.danger} />
              <Text style={styles.errorText}>{t('cashOutPage.pinIncomplete')}</Text>
            </View>
          )}
          {submitError ? (
            <View style={styles.errorMessage}>
              <MaterialIcons name="error" size={16} color={palette.danger} />
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}
        </View>


      </>)}
    </TransactionStep>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compactAmount: { fontSize: 28, color: palette.primary, fontWeight: "700", textAlign: "center", marginVertical: 12 },
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  summaryCard: {
    padding: 8, gap: 8,
  },
  panelTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, minHeight: 34,
  },
  summaryLabel: {
    flex: 1,
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    flexShrink: 1,
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  summaryValueStrong: {
    color: palette.coral,
    fontSize: 15,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  pinPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 20,
    gap: 16,
    alignItems: 'center',
  },
  pinLabel: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  pinInputContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  pinDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  pinDotFilled: {
    borderColor: palette.coral,
    backgroundColor: palette.softCoral,
  },
  pinDotError: {
    borderColor: palette.danger,
    backgroundColor: '#FFEBEE',
  },
  pinDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.coral,
  },
  pinInput: {
    width: '100%',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    color: palette.ink,
    letterSpacing: 8,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    width: '100%',
  },
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.coral,
    borderRadius: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  progressOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  primaryButtonDisabled: {
    backgroundColor: '#C7AAA4',
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMeta: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  successId: {
    color: palette.coral,
    fontSize: 13,
    fontWeight: '900',
  },
});

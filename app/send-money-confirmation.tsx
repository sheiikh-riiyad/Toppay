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
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import WalletMiniLogo from '@/components/WalletMiniLogo';
import { useAuth } from '@/contexts/auth';
import { useBonusRate } from '@/hooks/use-bonus-rate';
import { useSecureActionPin } from '@/hooks/use-secure-action-pin';
import { useWalletData } from '@/hooks/use-wallet-data';
import { cashOutMethods, formatCurrency, palette } from '@/constants/toppay';
import { calculateBonus } from '@/services/bonus';
import { createSendMoneyRequest } from '@/services/wallet';

function makeLocalRequestId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export default function SendMoneyConfirmationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { bonusRate } = useBonusRate('sendmoney');
  const verifySecureActionPin = useSecureActionPin();
  const { summary } = useWalletData(account?.uid);
  const params = useLocalSearchParams();
  
  const receiverName = params.receiverName as string;
  const receiverPhone = params.receiverPhone as string;
  const methodName = params.method as string;
  const amount = params.amount as string;
  const bonus = Number(params.bonus);
  const note = params.note as string;

  const [pin, setPin] = useState('');
  const [pressProgress, setPressProgress] = useState(0);
  const pressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressActiveRef = useRef(false);
  const submitLockRef = useRef(false);
  const requestIdRef = useRef(makeLocalRequestId('SEND'));
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const balance = summary?.balance ?? 0;
  const numericAmount = Number(amount) || 0;
  const bonusAmount = Number.isFinite(bonus) ? bonus : calculateBonus(numericAmount, bonusRate.percentis);
  const remainingBalance = Math.max(balance - numericAmount, 0);

  const method = cashOutMethods.find(m => m.name === methodName);
  const canConfirm = pin.length === 4 && !isSubmitting;

  useEffect(() => () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
    }
  }, []);

  function handlePressIn() {
    if (!canConfirm || pressActiveRef.current || submitLockRef.current) return;
    
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
      const transaction = await createSendMoneyRequest({
        uid: account.uid,
        requestId: requestIdRef.current,
        receiverName,
        receiverPhone,
        method: methodName,
        amount: numericAmount,
        bonus: bonusAmount,
        note,
      });

      router.replace({
        pathname: '/send-money-submitted',
        params: {
          requestId: transaction.requestId,
          receiverName,
          receiverPhone,
          method: methodName,
          amount,
          bonus: bonusAmount.toString(),
          note,
        },
      });
    } catch {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setPressProgress(0);
      setSubmitError(t('addBalance.balanceAddFailed'));
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
            <Text style={styles.kicker}>{t('sendMoneyPage.confirmKicker')}</Text>
            <Text style={styles.title}>{t('sendMoneyPage.confirmTitle')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="verified-user" size={17} color={palette.primary} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="check-circle" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('sendMoneyPage.reviewConfirm')}</Text>
            <Text style={styles.heroMeta}>{t('sendMoneyPage.checkDetails')}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('generic.recipient')}</Text>
            <Text style={styles.detailValue}>{receiverName}</Text>
          </View>
          <View style={styles.detailRowDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('generic.phoneNumber')}</Text>
            <Text style={styles.detailValue}>{receiverPhone}</Text>
          </View>
          <View style={styles.detailRowDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('generic.paymentMethod')}</Text>
            <View style={styles.methodBadge}>
              {method && (
                <>
                  <WalletMiniLogo color={method.color} mark={method.mark} name={method.name} size={32} />
                  <Text style={styles.methodBadgeText}>{method.name}</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.detailRowDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('generic.amount')}</Text>
            <Text style={styles.detailValue}>{formatCurrency(numericAmount)}</Text>
          </View>
          <View style={styles.detailRowDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('generic.bonus')}</Text>
            <Text style={styles.detailValueBonus}>{formatCurrency(bonusAmount)}</Text>
          </View>
          <View style={styles.detailRowDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('generic.message')}</Text>
            <Text style={styles.detailValue}>{note}</Text>
          </View>
          <View style={styles.detailRowDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('generic.remainingBalance')}</Text>
            <Text style={styles.detailValueStrong}>{formatCurrency(remainingBalance)}</Text>
          </View>
        </View>

        <View style={styles.pinPanel}>
          <Text style={styles.pinPanelTitle}>{t('sendMoneyPage.enterPin')}</Text>
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
          {pin.length !== 4 && (
            <Text style={styles.pinWarning}>{t('sendMoneyPage.pinWarning')}</Text>
          )}
          {submitError ? <Text style={styles.pinWarning}>{submitError}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    color: palette.primary,
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
    backgroundColor: palette.softGreen,
  },
  heroCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.primary,
    borderRadius: 8,
    padding: 15,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryDark,
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
    color: '#CBECE2',
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
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailRowDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  detailValue: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'right',
  },
  detailValueBonus: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  detailValueStrong: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.background,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  methodBadgeText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  pinPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  pinPanelTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  pinInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  pinInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 8,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 8,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.border,
  },
  pinDotFilled: {
    backgroundColor: palette.primary,
  },
  confirmPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  confirmPanelTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  confirmButton: {
    minHeight: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    overflow: 'hidden',
    position: 'relative',
  },
  confirmButtonDisabled: {
    backgroundColor: '#A8B7B0',
  },
  confirmButtonActive: {
    backgroundColor: palette.primaryDark,
  },
  confirmProgressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  confirmButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  confirmButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  pinWarning: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});

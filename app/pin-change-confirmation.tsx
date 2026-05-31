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

import { palette } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';
import { useSecureActionPin } from '@/hooks/use-secure-action-pin';

export default function PinChangeConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { changePin } = useAuth();
  const verifySecureActionPin = useSecureActionPin();
  const newPin = params.newPin as string;

  const [pin, setPin] = useState('');
  const [pressProgress, setPressProgress] = useState(0);
  const pressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitLockRef = useRef(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const canConfirm = pin.length === 4 && !isSubmitting;

  useEffect(() => () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
    }
  }, []);

  function handlePinChange(text: string) {
    if (text.length <= 4 && /^\d*$/.test(text)) {
      setPin(text);
      setSubmitError('');
    }
  }

  function handlePressIn() {
    if (!canConfirm || submitLockRef.current || pressTimerRef.current) return;

    setIsConfirming(true);
    let progress = 0;

    pressTimerRef.current = setInterval(() => {
      progress += 2;
      setPressProgress(progress);

      if (progress >= 100) {
        clearInterval(pressTimerRef.current!);
        pressTimerRef.current = null;
        setIsConfirming(false);
        void handleConfirmation();
      }
    }, 20);
  }

  function handlePressOut() {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsConfirming(false);
    setPressProgress(0);
  }

  async function handleConfirmation() {
    if (submitLockRef.current) {
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
      await changePin(newPin);
      router.replace('/pin-change-submitted');
    } catch {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setPressProgress(0);
      setSubmitError(t('pinPage.changeFailed'));
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
            <Text style={styles.kicker}>{t('pinPage.confirmKicker')}</Text>
            <Text style={styles.title}>{t('pinPage.confirmTitle')}</Text>
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
            <Text style={styles.heroTitle}>{t('pinPage.verifyWithPin')}</Text>
            <Text style={styles.heroMeta}>{t('pinPage.confirmHeroMeta')}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('generic.action')}</Text>
            <Text style={styles.summaryValue}>{t('pinPage.title')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('generic.status')}</Text>
            <View style={styles.statusBadge}>
              <MaterialIcons name="check-circle" size={14} color={palette.primary} />
              <Text style={styles.statusBadgeText}>{t('generic.readyToConfirm')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pinPanel}>
          <Text style={styles.pinPanelTitle}>{t('pinPage.enterYourPin')}</Text>
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
              <MaterialIcons name="security" size={20} color={palette.surface} />
              <Text style={styles.confirmButtonText}>
                {isSubmitting
                  ? t('common.loading')
                  : pressProgress > 0
                    ? `${Math.round(pressProgress)}%`
                    : t('generic.holdToConfirm')}
              </Text>
            </View>
          </Pressable>
          {pin.length !== 4 && !isSubmitting ? (
            <Text style={styles.pinWarning}>{t('pinPage.pinWarning')}</Text>
          ) : null}
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
  summaryCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.softGreen,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    color: palette.primary,
    fontSize: 12,
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

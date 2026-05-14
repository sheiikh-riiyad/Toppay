import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatCurrency, palette } from '@/constants/toppay';

export default function CashOutSubmittedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  const requestId = params.requestId as string;
  const method = params.method as string;
  const amount = Number(params.amount) || 0;
  const charge = Number(params.charge) || 0;
  const bonus = Number(params.bonus) || 0;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('cashOutPage.submittedKicker')}</Text>
            <Text style={styles.title}>{t('cashOutPage.submittedTitle')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="check-circle" size={20} color={palette.primary} />
          </View>
        </View>

        <Animated.View
          style={[
            styles.successCard,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}>
          <View style={styles.successIcon}>
            <MaterialIcons name="task-alt" size={48} color={palette.surface} />
          </View>
          <Text style={styles.successTitle}>{t('cashOutPage.submittedSuccessTitle')}</Text>
          <Text style={styles.successMeta}>{t('cashOutPage.submittedSuccessMeta')}</Text>
        </Animated.View>

        <View style={styles.confirmationCard}>
          <Text style={styles.panelTitle}>{t('cashOutPage.confirmationDetails')}</Text>
          <View style={styles.divider} />

          <ConfirmationRow label={t('generic.requestId')} value={requestId} highlight />
          <ConfirmationRow label={t('generic.method')} value={method} />
          <ConfirmationRow label={t('generic.amount')} value={formatCurrency(amount)} />
          <ConfirmationRow label={t('generic.serviceCharge')} value={formatCurrency(charge)} />
          <ConfirmationRow label={t('generic.bonus')} value={formatCurrency(bonus)} />

          <View style={styles.divider} />
          <ConfirmationRow label={t('generic.status')} value={t('generic.pendingReview')} highlight />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <MaterialIcons name="schedule" size={20} color={palette.amber} />
            <Text style={styles.infoTitle}>{t('cashOutPage.whatNext')}</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletText}>1</Text>
            </View>
            <Text style={styles.infoText}>{t('cashOutPage.nextReviewQueue')}</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletText}>2</Text>
            </View>
            <Text style={styles.infoText}>{t('cashOutPage.nextVerify')}</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletText}>3</Text>
            </View>
            <Text style={styles.infoText}>{t('cashOutPage.nextTransfer', { method })}</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoBullet}>
              <Text style={styles.infoBulletText}>4</Text>
            </View>
            <Text style={styles.infoText}>{t('cashOutPage.nextNotify')}</Text>
          </View>
        </View>

        <View style={styles.noteCard}>
          <MaterialIcons name="info" size={20} color={palette.primary} />
          <Text style={styles.noteText}>
            {t('cashOutPage.submittedNote')}
          </Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(tabs)')}
          accessibilityRole="button">
          <MaterialIcons name="home" size={18} color={palette.surface} />
          <Text style={styles.primaryButtonText}>{t('generic.backToHome')}</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.back()}
          accessibilityRole="button">
          <Text style={styles.secondaryButtonText}>{t('cashOutPage.history')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ConfirmationRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.confirmationRow}>
      <Text style={styles.confirmationLabel}>{label}</Text>
      <Text style={[styles.confirmationValue, highlight && styles.confirmationValueHighlight]}>
        {value}
      </Text>
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
  successCard: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: palette.coral,
    borderRadius: 8,
    padding: 20,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  successTitle: {
    color: palette.surface,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  successMeta: {
    color: '#FFE3DD',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmationCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 11,
  },
  panelTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmationLabel: {
    flex: 1,
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmationValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  confirmationValueHighlight: {
    color: palette.coral,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
  },
  infoCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softAmber,
  },
  infoBulletText: {
    color: palette.amber,
    fontSize: 13,
    fontWeight: '900',
  },
  infoText: {
    flex: 1,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    lineHeight: 16,
  },
  noteCard: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.softGreen,
    borderRadius: 8,
    padding: 12,
  },
  noteText: {
    flex: 1,
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
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
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
});

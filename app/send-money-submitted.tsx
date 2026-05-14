import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth';
import { useBonusRate } from '@/hooks/use-bonus-rate';
import { useWalletData } from '@/hooks/use-wallet-data';
import { formatCurrency, palette } from '@/constants/toppay';
import { calculateBonus } from '@/services/bonus';

export default function SendMoneySubmittedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { bonusRate } = useBonusRate('sendmoney');
  const { summary } = useWalletData(account?.uid);
  const params = useLocalSearchParams();

  const receiverName = params.receiverName as string;
  const receiverPhone = params.receiverPhone as string;
  const methodName = params.method as string;
  const amount = params.amount as string;
  const bonus = Number(params.bonus);
  const note = params.note as string;
  const requestId = params.requestId as string | undefined;

  const numericAmount = Number(amount) || 0;
  const bonusAmount = Number.isFinite(bonus) ? bonus : calculateBonus(numericAmount, bonusRate.percentis);
  const balance = summary?.balance ?? 0;
  const remainingBalance = Math.max(balance - numericAmount, 0);

  function handleBackToHome() {
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <MaterialIcons name="check-circle" size={80} color={palette.primary} />
        </View>

        <View style={styles.successCard}>
          <Text style={styles.successTitle}>{t('sendMoneyPage.submittedTitle')}</Text>
          <Text style={styles.successMeta}>{t('generic.pendingReview')}</Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>{t('generic.amountSent')}</Text>
          <Text style={styles.amountValue}>{formatCurrency(numericAmount)}</Text>
          <Text style={styles.bonusText}>+ {formatCurrency(bonusAmount)} {t('generic.bonus').toLowerCase()}</Text>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow label={t('generic.recipient')} value={receiverName} />
          <DetailDivider />
          <DetailRow label={t('generic.phone')} value={receiverPhone} />
          <DetailDivider />
          <DetailRow label={t('generic.method')} value={methodName} />
          {requestId ? (
            <>
              <DetailDivider />
              <DetailRow label={t('generic.requestId')} value={requestId} />
            </>
          ) : null}
          <DetailDivider />
          <DetailRow label={t('generic.message')} value={note} />
          <DetailDivider />
          <DetailRow
            label={t('generic.remainingBalance')}
            value={formatCurrency(remainingBalance)}
            strong
          />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <MaterialIcons name="info" size={20} color={palette.cyan} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>{t('sendMoneyPage.instantTitle')}</Text>
            <Text style={styles.infoMeta}>
              {t('sendMoneyPage.instantMeta')}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={handleBackToHome}
          accessibilityRole="button">
          <MaterialIcons name="home" size={18} color={palette.surface} />
          <Text style={styles.primaryButtonText}>{t('generic.backToHome')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, strong && styles.detailValueStrong]}>
        {value}
      </Text>
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
    gap: 18,
    alignItems: 'center',
  },
  successIcon: {
    marginTop: 20,
    marginBottom: 12,
  },
  successCard: {
    alignItems: 'center',
  },
  successTitle: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  successMeta: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  amountCard: {
    width: '100%',
    backgroundColor: palette.primary,
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: {
    color: '#CBECE2',
    fontSize: 13,
    fontWeight: '700',
  },
  amountValue: {
    color: palette.surface,
    fontSize: 36,
    fontWeight: '900',
  },
  bonusText: {
    color: '#DDF5EC',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
    maxWidth: '60%',
  },
  detailValueStrong: {
    color: palette.primary,
    fontSize: 15,
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: palette.softCyan,
    borderRadius: 8,
    padding: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 157, 178, 0.1)',
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  infoMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 16,
  },
  primaryButton: {
    width: '100%',
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
});

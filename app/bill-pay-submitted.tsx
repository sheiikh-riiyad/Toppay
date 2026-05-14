import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatCurrency, palette } from '@/constants/toppay';

export default function BillPaySubmittedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  const requestId = params.requestId as string | undefined;
  const billerName = params.billerName as string;
  const billerShortName = params.billerShortName as string;
  const billerCategory = params.billerCategory as string;
  const billingId = params.billingId as string;
  const billDate = params.billDate as string | undefined;
  const billType = params.billType as string | undefined;
  const amount = Number(params.amount) || 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <MaterialIcons name="check-circle" size={80} color={palette.amber} />
        </View>

        <View style={styles.successCard}>
          <Text style={styles.successTitle}>{t('billPayPage.submittedTitle')}</Text>
          <Text style={styles.successMeta}>{t('generic.pendingReview')}</Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>{t('billPayPage.billAmount')}</Text>
          <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow label={t('billPayPage.biller')} value={billerShortName || billerName} />
          <DetailDivider />
          <DetailRow label={t('billPayPage.billingId')} value={billingId} />
          <DetailDivider />
          <DetailRow label={t('billPayPage.category')} value={t(`billPayPage.categories.${billerCategory}`)} />
          {billDate ? (
            <>
              <DetailDivider />
              <DetailRow label={t('billPayPage.billDate')} value={billDate} />
            </>
          ) : null}
          {billType ? (
            <>
              <DetailDivider />
              <DetailRow label={t('billPayPage.billType')} value={t(`billPayPage.billTypes.${billType}`)} />
            </>
          ) : null}
          {requestId ? (
            <>
              <DetailDivider />
              <DetailRow label={t('generic.requestId')} value={requestId} />
            </>
          ) : null}
          <DetailDivider />
          <DetailRow label={t('generic.status')} value={t('generic.pendingReview')} strong />
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={20} color={palette.amber} />
          <Text style={styles.infoText}>{t('billPayPage.submittedMeta')}</Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/(tabs)')}
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
    backgroundColor: palette.amber,
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: {
    color: '#FFF7DE',
    fontSize: 13,
    fontWeight: '700',
  },
  amountValue: {
    color: palette.surface,
    fontSize: 36,
    fontWeight: '900',
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
    color: palette.amber,
    fontSize: 15,
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: palette.softAmber,
    borderRadius: 8,
    padding: 14,
  },
  infoText: {
    flex: 1,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  primaryButton: {
    width: '100%',
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.amber,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
});

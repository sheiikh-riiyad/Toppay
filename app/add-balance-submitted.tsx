import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth';
import { useWalletData } from '@/hooks/use-wallet-data';
import { type WalletTransaction } from '@/services/wallet';
import {
    formatCurrency,
    palette,
    type PendingBalanceRequest,
} from '@/constants/toppay';

function readParam(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function toPendingBalanceRequest(transaction: WalletTransaction): PendingBalanceRequest {
  return {
    id: transaction.requestId,
    method: transaction.method || 'Add balance',
    amount: transaction.amount,
    trxId: transaction.trxId || 'N/A',
    proofName: transaction.proofName || 'Not attached',
    submittedAt: transaction.createdAtText,
    eta: 'Waiting for approval',
    status: 'Pending review',
    color: palette.amber,
    tone: palette.softAmber,
    icon: 'pending-actions',
  };
}

export default function AddBalanceSubmittedScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { pendingTransactions } = useWalletData(account?.uid);
  const params = useLocalSearchParams();
  const requestId = readParam(params.requestId, 'ADD-NEW');
  const method = readParam(params.method, 'Add balance');
  const trxId = readParam(params.trxId, 'N/A');
  const proofName = readParam(params.proofName, 'payment-proof.jpg');
  const proofImageUri = readParam(params.proofImageUri, '');
  const amount = Number(readParam(params.amount, '0')) || 0;

  const submittedRequest: PendingBalanceRequest = {
    id: requestId,
    method,
    amount,
    trxId,
    proofName,
    submittedAt: 'Just now',
    eta: 'Waiting for approval',
    status: 'Pending review',
    color: palette.amber,
    tone: palette.softAmber,
    icon: 'pending-actions',
  };
  const firebasePendingRequests = pendingTransactions
    .filter((transaction) => transaction.type === 'add_balance')
    .map(toPendingBalanceRequest);
  const visibleRequests = firebasePendingRequests.length > 0 ? firebasePendingRequests : [submittedRequest];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successHero}>
          <View style={styles.successIcon}>
            <MaterialIcons name="task-alt" size={42} color={palette.primary} />
          </View>
          <Text style={styles.title}>{t('addBalancePage.submittedTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('addBalancePage.submittedSubtitle')}
          </Text>
        </View>

        <View style={styles.stepRail}>
          <StepBadge number="1" label={t('addBalancePage.stepSubmitted')} active />
          <View style={styles.stepLine} />
          <StepBadge number="2" label={t('addBalancePage.stepReviewing')} active />
          <View style={styles.stepLine} />
          <StepBadge number="3" label={t('addBalancePage.stepBalanceAdded')} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <MaterialIcons name="receipt-long" size={23} color={palette.primary} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>{method}</Text>
              <Text style={styles.summaryMeta}>{t('addBalancePage.requestIdLine', { id: requestId })}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{t('generic.pending')}</Text>
            </View>
          </View>
          <SummaryRow label={t('generic.paidAmount')} value={formatCurrency(amount)} />
          <SummaryRow label={`${t('addBalance.transactionId')} / ${t('generic.transactionReference').toLowerCase()}`} value={trxId || t('generic.notProvided')} />
          <SummaryRow label={t('generic.proofFile')} value={proofName || t('generic.notAttached')} />
          {proofImageUri && (
            <View style={styles.imagePreviewSection}>
              <Text style={styles.imageSectionLabel}>{t('addBalancePage.proofImage')}</Text>
              <Image
                source={{ uri: proofImageUri }}
                style={styles.summaryImage}
                resizeMode="contain"
              />
            </View>
          )}
          <SummaryRow label={t('addBalancePage.estimatedReview')} value={t('addBalancePage.within15Minutes')} strong />
        </View>

        <PendingTransactionsPanel requests={visibleRequests} />

        <View style={styles.actionRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace('/')}
            accessibilityRole="button">
            <MaterialIcons name="home" size={19} color={palette.primary} />
            <Text style={styles.secondaryButtonText}>{t('generic.home')}</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/add-balance')}
            accessibilityRole="button">
            <MaterialIcons name="add-circle" size={19} color={palette.surface} />
            <Text style={styles.primaryButtonText}>{t('generic.addMore')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingTransactionsPanel({ requests }: { requests: PendingBalanceRequest[] }) {
  const { t } = useTranslation();

  return (
    <View style={styles.pendingPanel}>
      <View style={styles.pendingPanelHeader}>
        <View>
          <Text style={styles.pendingPanelTitle}>{t('generic.pendingTransactions')}</Text>
          <Text style={styles.pendingPanelMeta}>{t('addBalancePage.pendingWaiting', { count: requests.length })}</Text>
        </View>
        <View style={styles.pendingCountBadge}>
          <Text style={styles.pendingCountText}>{requests.length}</Text>
        </View>
      </View>
      {requests.map((request) => (
        <View key={`${request.id}-${request.trxId}`} style={styles.pendingRequestRow}>
          <View style={[styles.requestIcon, { backgroundColor: request.tone }]}>
            <MaterialIcons name={request.icon} size={21} color={request.color} />
          </View>
          <View style={styles.requestCopy}>
            <Text style={styles.requestTitle}>{request.method}</Text>
            <Text style={styles.requestMeta}>
              {request.id}  |  {request.submittedAt}
            </Text>
            <Text style={styles.requestProof}>TRX {request.trxId}</Text>
          </View>
          <View style={styles.requestRight}>
            <Text style={styles.requestAmount}>{formatCurrency(request.amount)}</Text>
            <Text style={styles.requestStatus}>{request.status}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function StepBadge({ number, label, active }: { number: string; label: string; active?: boolean }) {
  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
        <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{number}</Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
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
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 16,
  },
  successHero: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 22,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softGreen,
    marginBottom: 14,
  },
  title: {
    color: palette.ink,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  stepRail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  stepItem: {
    alignItems: 'center',
    gap: 5,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softNeutral,
  },
  stepCircleActive: {
    backgroundColor: palette.primary,
  },
  stepNumber: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  stepNumberActive: {
    color: palette.surface,
  },
  stepLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
    marginHorizontal: 9,
  },
  summaryCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softGreen,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryMeta: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 8,
    backgroundColor: palette.softAmber,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    color: palette.amber,
    fontSize: 11,
    fontWeight: '900',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    flex: 1,
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  summaryValueStrong: {
    color: palette.primary,
    fontSize: 15,
  },
  imagePreviewSection: {
    gap: 8,
    marginVertical: 4,
  },
  imageSectionLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: palette.background,
  },
  pendingPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  pendingPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingPanelTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  pendingPanelMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  pendingCountBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softAmber,
  },
  pendingCountText: {
    color: palette.amber,
    fontSize: 14,
    fontWeight: '900',
  },
  pendingRequestRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 10,
  },
  requestIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCopy: {
    flex: 1,
  },
  requestTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  requestMeta: {
    color: palette.muted,
    fontSize: 10,
    marginTop: 4,
  },
  requestProof: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  requestRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  requestAmount: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  requestStatus: {
    color: palette.amber,
    fontSize: 10,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryButtonText: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  primaryButton: {
    flex: 1,
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

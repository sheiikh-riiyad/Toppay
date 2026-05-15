import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import WalletMiniLogo from '@/components/WalletMiniLogo';
import { useAuth } from '@/contexts/auth';
import { useBonusRate } from '@/hooks/use-bonus-rate';
import { useWalletData } from '@/hooks/use-wallet-data';
import { calculateBonus } from '@/services/bonus';
import { type WalletTransaction } from '@/services/wallet';
import {
    cashOutMethods,
    formatCurrency,
    palette,
    type CashOutMethod,
    type PendingCashOutRequest,
} from '@/constants/toppay';

const quickAmounts = ['1000', '2000', '5000', '10000'];
const chargeRate = 0.0185;

function toPendingCashOutRequest(transaction: WalletTransaction): PendingCashOutRequest {
  return {
    id: transaction.requestId,
    method: transaction.method || 'Cash out',
    receiverAccount: transaction.receiverAccount || 'N/A',
    amount: transaction.amount,
    charge: transaction.fee,
    bonus: transaction.bonus,
    submittedAt: transaction.createdAtText,
    eta: 'Waiting for approval',
    status: 'Pending review',
    color: palette.amber,
    tone: palette.softAmber,
    icon: 'pending-actions',
  };
}

export default function CashOutScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { account } = useAuth();
  const { bonusRate } = useBonusRate('cashout');
  const [selectedMethod, setSelectedMethod] = useState<CashOutMethod>(cashOutMethods[0]);
  const { pendingTransactions, summary } = useWalletData(account?.uid);
  const [receiverAccount, setReceiverAccount] = useState('01710 220 443');
  const [amount, setAmount] = useState('5000');
  const [note, setNote] = useState('Urgent payout request');

  const balance = summary?.balance ?? 0;
  const numericAmount = Number(amount) || 0;
  const charge = numericAmount * chargeRate;
  const bonusAmount = calculateBonus(numericAmount, bonusRate.percentis);
  const totalDebit = numericAmount + charge;
  const remainingBalance = Math.max(balance - totalDebit, 0);
  const canSubmit = numericAmount > 0 && receiverAccount.trim().length >= 6;
  const pendingCardWidth = Math.min(width - 64, 318);
  const requests = pendingTransactions
    .filter((transaction) => transaction.type === 'cash_out')
    .map(toPendingCashOutRequest);

  function chooseMethod(method: CashOutMethod) {
    setSelectedMethod(method);
    setReceiverAccount('');
  }

  function submitRequest() {
    const requestId = `CASH-${Math.floor(4000 + Math.random() * 5000)}`;

    // Navigate to confirmation page with all transaction details
    router.push({
      pathname: '/cash-out-confirmation',
      params: {
        requestId,
        method: selectedMethod.name,
        receiverAccount: receiverAccount.trim(),
        amount: numericAmount.toString(),
        charge: charge.toString(),
        bonus: bonusAmount.toString(),
        bonusPercentis: bonusRate.percentis.toString(),
        note,
        totalDebit: totalDebit.toString(),
      },
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('cashOutPage.kicker')}</Text>
            <Text style={styles.title}>{t('cashOutPage.title')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="payments" size={20} color={palette.coral} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="account-balance-wallet" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('cashOutPage.heroTitle')}</Text>
            <Text style={styles.heroMeta}>{t('cashOutPage.balanceLine', { amount: formatCurrency(balance) })}</Text>
          </View>
          <Text style={styles.heroTag}>{t('cashOutPage.bonusTag', { rate: bonusRate.label })}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('cashOutPage.method')}</Text>
          <View style={styles.methodGrid}>
            {cashOutMethods.map((method) => {
              const active = method.name === selectedMethod.name;

              return (
                <Pressable
                  key={method.name}
                  style={[styles.methodCard, active && styles.methodCardActive]}
                  onPress={() => chooseMethod(method)}
                  accessibilityRole="button">
                  <WalletMiniLogo color={method.color} mark={method.mark} name={method.name} size={38} />
                  <Text style={styles.methodName}>{method.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {selectedMethod.type === 'Mobile wallet'
              ? t('cashOutPage.mobileReceiverLabel', { method: selectedMethod.name })
              : t('cashOutPage.bankReceiverLabel')}
          </Text>
          <View style={styles.inputRow}>
            <MaterialIcons name={selectedMethod.icon} size={21} color={palette.muted} />
            <TextInput
              value={receiverAccount}
              onChangeText={setReceiverAccount}
              placeholder={selectedMethod.type === 'Mobile wallet'
                ? t('cashOutPage.mobilePlaceholder')
                : t('cashOutPage.bankPlaceholder')}
              placeholderTextColor={palette.muted}
              keyboardType={selectedMethod.type === 'Mobile wallet' ? 'phone-pad' : 'default'}
              style={styles.input}
            />
          </View>
          <View style={styles.methodInfo}>
            <MaterialIcons name="info" size={18} color={selectedMethod.color} />
            <Text style={styles.methodInfoText}>
              {t('cashOutPage.methodInfo', {
                type: t(selectedMethod.type === 'Mobile wallet' ? 'methodTypes.mobileWallet' : 'methodTypes.bankAccount').toLowerCase(),
              })}
            </Text>
          </View>
        </View>

        <View style={styles.amountPanel}>
          <View style={styles.amountHeader}>
            <Text style={styles.panelTitle}>{t('cashOutPage.amount')}</Text>
            <Text style={styles.balanceText}>{t('cashOutPage.availableLine', { amount: formatCurrency(balance) })}</Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.currencyPrefix}>BDT</Text>
            <TextInput
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#9AA7A1"
              style={styles.amountInput}
            />
          </View>
          <View style={styles.quickAmountRow}>
            {quickAmounts.map((quickAmount) => (
              <Pressable
                key={quickAmount}
                style={[
                  styles.quickAmountChip,
                  amount === quickAmount && styles.quickAmountChipActive,
                ]}
                onPress={() => setAmount(quickAmount)}
                accessibilityRole="button">
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === quickAmount && styles.quickAmountTextActive,
                  ]}>
                  {formatCurrency(Number(quickAmount)).replace('.00', '')}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.inputRow}>
            <MaterialIcons name="notes" size={21} color={palette.muted} />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('cashOutPage.notePlaceholder')}
              placeholderTextColor={palette.muted}
              style={styles.input}
            />
          </View>
        </View>

        <PendingCashOutSlider requests={requests} cardWidth={pendingCardWidth} />

        <View style={styles.summaryCard}>
          <SummaryRow label={t('generic.method')} value={selectedMethod.name} />
          <SummaryRow label={t('generic.receiver')} value={receiverAccount || t('generic.required')} />
          <SummaryRow label={t('generic.cashOut')} value={formatCurrency(numericAmount)} />
          <SummaryRow label={t('generic.serviceCharge')} value={formatCurrency(charge)} />
          <SummaryRow label={t('generic.rate')} value="1.85%" />
          <SummaryRow label={`${t('generic.bonus')} (${bonusRate.label})`} value={formatCurrency(bonusAmount)} />
          <View style={styles.summaryDivider} />
          <SummaryRow label={t('generic.totalDebit')} value={formatCurrency(totalDebit)} strong />
          <SummaryRow label={t('generic.remainingBalance')} value={formatCurrency(remainingBalance)} />
        </View>

        <View style={styles.securityNote}>
          <MaterialIcons name="info" size={20} color={palette.primary} />
          <Text style={styles.securityText}>
            {t('cashOutPage.securityNote')}
          </Text>
        </View>

        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
          disabled={!canSubmit}
          onPress={submitRequest}
          accessibilityRole="button">
          <MaterialIcons name="lock" size={18} color={palette.surface} />
          <Text style={styles.primaryButtonText}>{t('cashOutPage.submit')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingCashOutSlider({
  requests,
  cardWidth,
}: {
  requests: PendingCashOutRequest[];
  cardWidth: number;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.pendingPanel}>
      <View style={styles.pendingHeader}>
        <View>
          <Text style={styles.panelTitle}>{t('generic.pendingTransactions')}</Text>
          <Text style={styles.pendingHeaderMeta}>{t('cashOutPage.pendingHeaderMeta')}</Text>
        </View>
        <View style={styles.pendingCountBadge}>
          <Text style={styles.pendingCountText}>{requests.length}</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pendingRail}>
        {requests.length === 0 ? (
          <Text style={styles.emptyPendingText}>{t('generic.noPendingTransactions')}</Text>
        ) : (
          requests.map((request) => (
            <PendingCashOutCard key={`${request.id}-${request.submittedAt}`} request={request} width={cardWidth} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PendingCashOutCard({
  request,
  width,
}: {
  request: PendingCashOutRequest;
  width: number;
}) {
  const { t } = useTranslation();

  return (
    <View style={[styles.pendingCard, { width }]}>
      <View style={styles.pendingCardTop}>
        <View style={[styles.pendingIcon, { backgroundColor: request.tone }]}>
          <MaterialIcons name={request.icon} size={22} color={request.color} />
        </View>
        <View style={styles.pendingCopy}>
          <Text style={styles.pendingTitle}>{request.method}</Text>
          <Text style={styles.pendingMeta}>{request.receiverAccount}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{t('generic.pending')}</Text>
        </View>
      </View>
      <View style={styles.pendingDivider} />
      <View style={styles.pendingBottom}>
        <View>
          <Text style={styles.pendingLabel}>{t('generic.amount')}</Text>
          <Text style={styles.pendingAmount}>{formatCurrency(request.amount)}</Text>
        </View>
        <View style={styles.pendingRight}>
          <Text style={styles.pendingLabel}>{request.id}</Text>
          <Text style={styles.pendingEta}>{request.eta}</Text>
        </View>
      </View>
      <Text style={styles.pendingSubmitted}>{request.submittedAt}</Text>
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
    color: palette.coral,
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
    backgroundColor: palette.softCoral,
  },
  heroCard: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: palette.coral,
    borderRadius: 8,
    padding: 15,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    color: '#FFE3DD',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  heroTag: {
    color: palette.coral,
    backgroundColor: palette.surface,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900',
  },
  submittedCard: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.softGreen,
    borderRadius: 8,
    padding: 13,
  },
  submittedCopy: {
    flex: 1,
  },
  submittedTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  submittedMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  panelTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodCard: {
    width: '22.7%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 7,
  },
  methodCardActive: {
    borderColor: palette.coral,
    backgroundColor: palette.softCoral,
  },
  methodName: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  methodInfo: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: palette.background,
    borderRadius: 8,
    padding: 11,
  },
  methodInfoText: {
    flex: 1,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  amountPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  balanceText: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  amountBox: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.softCoral,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    color: palette.coral,
    fontSize: 14,
    fontWeight: '900',
  },
  amountInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 34,
    fontWeight: '900',
  },
  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountChip: {
    minHeight: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
  },
  quickAmountChipActive: {
    backgroundColor: palette.coral,
    borderColor: palette.coral,
  },
  quickAmountText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  quickAmountTextActive: {
    color: palette.surface,
  },
  pendingPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingHeaderMeta: {
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
  pendingRail: {
    gap: 12,
    paddingRight: 14,
  },
  emptyPendingText: {
    width: 260,
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 12,
  },
  pendingCard: {
    minHeight: 152,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    gap: 12,
  },
  pendingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingCopy: {
    flex: 1,
  },
  pendingTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  pendingMeta: {
    color: palette.muted,
    fontSize: 12,
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
    fontSize: 10,
    fontWeight: '900',
  },
  pendingDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  pendingBottom: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  pendingAmount: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  pendingRight: {
    alignItems: 'flex-end',
  },
  pendingEta: {
    color: palette.coral,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
  pendingSubmitted: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 11,
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
    color: palette.coral,
    fontSize: 15,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  securityNote: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.softGreen,
    borderRadius: 8,
    padding: 12,
  },
  securityText: {
    flex: 1,
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
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
  primaryButtonDisabled: {
    backgroundColor: '#C7AAA4',
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});

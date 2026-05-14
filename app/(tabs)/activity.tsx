import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth';
import { useWalletData } from '@/hooks/use-wallet-data';
import {
  formatCurrency,
  palette,
  transactions as sampleTransactions,
  type Transaction,
  type WalletIconName,
} from '@/constants/toppay';
import { type WalletTransaction } from '@/services/wallet';

const filters = ['filterAll', 'filterMoneyIn', 'filterMoneyOut'];

function getTransactionIcon(transaction: WalletTransaction) {
  if (transaction.type === 'add_balance') {
    return {
      icon: 'account-balance' as const,
      color: palette.primary,
      tone: palette.softGreen,
    };
  }

  if (transaction.type === 'send_money') {
    return {
      icon: 'send' as const,
      color: palette.coral,
      tone: palette.softCoral,
    };
  }

  if (transaction.type === 'cash_out') {
    return {
      icon: 'payments' as const,
      color: palette.coral,
      tone: palette.softCoral,
    };
  }

  if (transaction.type === 'mobile_recharge') {
    return {
      icon: 'phone-android' as const,
      color: palette.cyan,
      tone: palette.softCyan,
    };
  }

  if (transaction.type === 'bill_payment') {
    return {
      icon: transaction.billerCategory === 'internet' ? 'router' as const : 'electric-bolt' as const,
      color: transaction.billerCategory === 'internet' ? palette.cyan : palette.amber,
      tone: transaction.billerCategory === 'internet' ? palette.softCyan : palette.softAmber,
    };
  }

  return {
    icon: 'receipt-long' as const,
    color: palette.primary,
    tone: palette.softGreen,
  };
}

function toActivityTransaction(transaction: WalletTransaction): Transaction {
  const icon = getTransactionIcon(transaction);
  const signedAmount = transaction.direction === 'out'
    ? -Math.abs(transaction.totalDebit || transaction.amount)
    : Math.abs(transaction.amount);

  return {
    id: transaction.requestId,
    title: transaction.title,
    meta: transaction.method || transaction.note || 'Wallet transaction',
    amount: signedAmount,
    status: 'Completed',
    time: transaction.createdAtText,
    ...icon,
  };
}

export default function ActivityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { doneTransactions } = useWalletData(account?.uid);
  const firebaseTransactions = doneTransactions
    .filter((transaction) => transaction.type !== 'system')
    .map(toActivityTransaction);
  const transactions = firebaseTransactions.length > 0
    ? firebaseTransactions
    : sampleTransactions.filter((transaction) => transaction.status === 'Completed');
  const moneyIn = transactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((total, transaction) => total + transaction.amount, 0);
  const moneyOut = transactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((total, transaction) => total + Math.abs(transaction.amount), 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{t('activityPage.kicker')}</Text>
            <Text style={styles.title}>{t('activityPage.title')}</Text>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push('/pending-transactions')}
            accessibilityRole="button">
            <MaterialIcons name="receipt-long" size={22} color={palette.ink} />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            title={t('activityPage.moneyIn')}
            amount={formatCurrency(moneyIn)}
            icon="arrow-downward"
            color={palette.primary}
            tone={palette.softGreen}
          />
          <SummaryCard
            title={t('activityPage.moneyOut')}
            amount={formatCurrency(-moneyOut)}
            icon="arrow-upward"
            color={palette.coral}
            tone={palette.softCoral}
          />
        </View>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={22} color={palette.muted} />
          <TextInput
            placeholder={t('activityPage.searchTransactions')}
            placeholderTextColor={palette.muted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterRow}>
          {filters.map((filter, index) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, index === 0 && styles.filterChipActive]}
              accessibilityRole="button">
              <Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>
                {t(`activityPage.${filter}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.transactionList}>
          {transactions.map((transaction) => (
            <ActivityRow key={transaction.id} transaction={transaction} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  title,
  amount,
  icon,
  color,
  tone,
}: {
  title: string;
  amount: string;
  icon: WalletIconName;
  color: string;
  tone: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: tone }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryAmount}>{amount}</Text>
    </View>
  );
}

function ActivityRow({ transaction }: { transaction: Transaction }) {
  const isCredit = transaction.amount > 0;

  return (
    <Pressable style={styles.activityRow} accessibilityRole="button">
      <View style={[styles.transactionIcon, { backgroundColor: transaction.tone }]}>
        <MaterialIcons name={transaction.icon} size={22} color={transaction.color} />
      </View>
      <View style={styles.transactionBody}>
        <View style={styles.transactionTop}>
          <Text style={styles.transactionTitle}>{transaction.title}</Text>
          <Text style={[styles.transactionAmount, isCredit && styles.creditAmount]}>
            {formatCurrency(transaction.amount)}
          </Text>
        </View>
        <View style={styles.transactionBottom}>
          <Text style={styles.transactionMeta}>{transaction.meta}</Text>
          <StatusPill status={transaction.status} />
        </View>
        <Text style={styles.transactionId}>
          {transaction.id}  |  {transaction.time}
        </Text>
      </View>
    </Pressable>
  );
}

function StatusPill({ status }: { status: Transaction['status'] }) {
  const { t } = useTranslation();
  const tone =
    status === 'Completed'
      ? palette.softGreen
      : status === 'Pending'
        ? palette.softAmber
        : palette.softCoral;
  const color =
    status === 'Completed' ? palette.primary : status === 'Pending' ? palette.amber : palette.danger;

  return (
    <View style={[styles.statusPill, { backgroundColor: tone }]}>
      <Text style={[styles.statusText, { color }]}>{t(`statuses.${status.toLowerCase()}`)}</Text>
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
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minHeight: 126,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  summaryTitle: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryAmount: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 5,
  },
  searchBox: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  filterTextActive: {
    color: palette.surface,
  },
  transactionList: {
    gap: 10,
  },
  activityRow: {
    minHeight: 98,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionBody: {
    flex: 1,
    gap: 7,
  },
  transactionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  transactionTitle: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  transactionAmount: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: '900',
  },
  creditAmount: {
    color: palette.primary,
  },
  transactionBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  transactionMeta: {
    flex: 1,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  transactionId: {
    color: palette.muted,
    fontSize: 10,
  },
});

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, formatCurrency, type WalletIconName } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';
import { useWalletData } from '@/hooks/use-wallet-data';
import { type WalletTransaction } from '@/services/wallet';

function getPendingIcon(transaction: WalletTransaction): {
  icon: WalletIconName;
  color: string;
  tone: string;
} {
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
    icon: 'payments' as const,
    color: palette.amber,
    tone: palette.softAmber,
  };
}

export default function PendingTransactionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { pendingTransactions } = useWalletData(account?.uid);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('generic.pendingReview')}</Text>
            <Text style={styles.title}>{t('generic.pendingTransactions')}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingTransactions.length}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={20} color={palette.amber} />
          <Text style={styles.infoText}>
            Pending requests do not change wallet balance. When admin marks a request done, the balance update and activity entry appear together.
          </Text>
        </View>

        <View style={styles.list}>
          {pendingTransactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="hourglass-empty" size={28} color={palette.muted} />
              <Text style={styles.emptyTitle}>{t('generic.noPendingTransactions')}</Text>
            </View>
          ) : (
            pendingTransactions.map((transaction) => (
              <PendingRow key={transaction.id} transaction={transaction} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingRow({ transaction }: { transaction: WalletTransaction }) {
  const { t } = useTranslation();
  const icon = getPendingIcon(transaction);
  const amount = transaction.direction === 'out'
    ? -Math.abs(transaction.totalDebit || transaction.amount)
    : Math.abs(transaction.amount);

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: icon.tone }]}>
        <MaterialIcons name={icon.icon} size={22} color={icon.color} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{transaction.title}</Text>
          <Text style={styles.rowAmount}>{formatCurrency(amount)}</Text>
        </View>
        <Text style={styles.rowMeta}>{transaction.requestId}  |  {transaction.createdAtText}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{t('generic.pendingReview')}</Text>
        </View>
      </View>
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
    color: palette.amber,
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
  countBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softAmber,
  },
  countText: {
    color: palette.amber,
    fontSize: 15,
    fontWeight: '900',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 8,
    backgroundColor: palette.softAmber,
    padding: 14,
  },
  infoText: {
    flex: 1,
    color: palette.ink,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  list: {
    gap: 10,
  },
  emptyCard: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
  },
  emptyTitle: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  row: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 7,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTitle: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  rowAmount: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  rowMeta: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    alignSelf: 'flex-start',
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
});

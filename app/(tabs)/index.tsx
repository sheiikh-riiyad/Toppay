import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppLogo from '@/components/AppLogo';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/auth';
import { useWalletData } from '@/hooks/use-wallet-data';
import {
    formatCurrency,
    offerBanners,
    palette,
    quickActions,
    secondaryServices,
    sponsors,
    transactions as sampleTransactions,
    type OfferBanner,
    type Sponsor,
    type Transaction,
    type WalletAction,
} from '@/constants/toppay';
import { type WalletTransaction } from '@/services/wallet';

const actionRoutes: Record<string, Href> = {
  'Send Money': '/send-money',
  'Cash Out': '/cash-out',
  Recharge: '/mobile-recharge',
  Payment: '/bill-pay',
  Electricity: '/bill-pay',
  Internet: '/bill-pay',
  'Add Balance': '/add-balance',
};

const actionTitleKeys: Record<string, string> = {
  'Send Money': 'home.sendMoney',
  'Cash Out': 'home.cashOut',
  Recharge: 'home.mobileRecharge',
  Payment: 'home.payBills',
  'Add Balance': 'home.addBalance',
  Rewards: 'home.rewards',
};

const actionSubtitleKeys: Record<string, string> = {
  'Send Money': 'home.sendMoneySubtitle',
  'Cash Out': 'home.cashOutSubtitle',
  Recharge: 'home.mobileRechargeSubtitle',
  Payment: 'home.paymentSubtitle',
  'Add Balance': 'home.addBalanceSubtitle',
  Rewards: 'home.rewardsSubtitle',
};

const offerTranslationKeys = ['cashback', 'bank', 'recharge', 'security'];

function getWalletTransactionIcon(transaction: WalletTransaction) {
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

function toHomeTransaction(transaction: WalletTransaction): Transaction {
  const icon = getWalletTransactionIcon(transaction);
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

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { doneTransactions, pendingTransactions, summary } = useWalletData(account?.uid);
  const realRecentTransactions = doneTransactions
    .filter((transaction) => transaction.type !== 'system')
    .slice(0, 3)
    .map(toHomeTransaction);
  const recentTransactions = realRecentTransactions.length > 0
    ? realRecentTransactions
    : sampleTransactions.slice(0, 3);
  const firstName = account?.name?.split(' ')[0] || 'Toppay';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <View style={styles.logoRow}>
              <AppLogo size={32} />
              <Text style={styles.brand}>Toppay</Text>
            </View>
            <Text style={styles.greeting}>{t('home.greeting', { name: firstName })}</Text>
          </View>
          <Pressable style={styles.iconButton} accessibilityRole="button">
            <MaterialIcons name="notifications" size={22} color={palette.ink} />
          </Pressable>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>{t('home.availableBalance')}</Text>
            <View style={styles.verifiedPill}>
              <MaterialIcons name="verified-user" size={14} color={palette.primaryDark} />
              <Text style={styles.verifiedText}>{t('home.verified')}</Text>
            </View>
          </View>
          <Text style={styles.balanceAmount}>{formatCurrency(summary?.balance ?? 0)}</Text>
          <View style={styles.balanceFooter}>
            <View>
              <Text style={styles.balanceMetaLabel}>{t('home.monthlyLimit')}</Text>
              <Text style={styles.balanceMetaValue}>{formatCurrency(summary?.monthlyLimit ?? 150000).replace('.00', '')}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View>
              <Text style={styles.balanceMetaLabel}>{t('home.rewards')}</Text>
              <Text style={styles.balanceMetaValue}>{summary?.rewardPoints ?? 0} pts</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addBalanceButton, pressed && styles.addBalanceButtonPressed]}
            onPress={() => router.push('/add-balance')}
            accessibilityRole="button">
            <Text style={styles.addBalanceButtonText}>{t('home.addBalance')}</Text>
            <MaterialIcons name="add" size={18} color={palette.surface} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.pendingShortcut, pressed && styles.pendingShortcutPressed]}
          onPress={() => router.push('/pending-transactions')}
          accessibilityRole="button">
          <View style={styles.pendingShortcutIcon}>
            <MaterialIcons name="pending-actions" size={23} color={palette.amber} />
          </View>
          <View style={styles.pendingShortcutCopy}>
            <Text style={styles.pendingShortcutTitle}>{t('home.pendingTransactions')}</Text>
            <Text style={styles.pendingShortcutMeta}>
              {t('home.pendingTransactionsMeta', { count: pendingTransactions.length })}
            </Text>
          </View>
          <View style={styles.pendingShortcutCount}>
            <Text style={styles.pendingShortcutCountText}>{pendingTransactions.length}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={palette.muted} />
        </Pressable>

        <LanguageToggle />
        <OfferSlider />

        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <ActionCard key={action.title} action={action} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.sponsoredPartners')}</Text>
          <Text style={styles.sectionLink}>{t('home.offers')}</Text>
        </View>
        <View style={styles.sponsorGrid}>
          {sponsors.map((sponsor) => (
            <SponsorBadge key={sponsor.name} sponsor={sponsor} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.moreServices')}</Text>
          <Text style={styles.sectionLink}>{t('home.all')}</Text>
        </View>
        <View style={styles.serviceGrid}>
          {secondaryServices.map((service) => (
            <ServiceTile key={service.title} service={service} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.recentActivity')}</Text>
          <Text style={styles.sectionLink}>{t('common.details')}</Text>
        </View>
        <View style={styles.transactionList}>
          {recentTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function OfferSlider() {
  const [activeOffer, setActiveOffer] = useState(0);
  const { width } = useWindowDimensions();
  const bannerWidth = width - 36;

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
    setActiveOffer(Math.min(Math.max(nextIndex, 0), offerBanners.length - 1));
  }

  return (
    <View style={styles.offerSlider}>
      <ScrollView
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}>
        {offerBanners.map((banner, index) => (
          <OfferCard
            key={banner.title}
            banner={banner}
            width={bannerWidth}
            translationKey={offerTranslationKeys[index]}
          />
        ))}
      </ScrollView>
      <View style={styles.offerDots}>
        {offerBanners.map((banner, index) => (
          <View
            key={banner.title}
            style={[styles.offerDot, activeOffer === index && styles.offerDotActive]}
          />
        ))}
      </View>
    </View>
  );
}

function OfferCard({
  banner,
  width,
  translationKey,
}: {
  banner: OfferBanner;
  width: number;
  translationKey: string;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      style={[styles.offerBanner, { width, backgroundColor: banner.background }]}
      accessibilityRole="button">
      <View style={styles.offerCopy}>
        <Text style={styles.offerEyebrow}>{t(`homeOffers.${translationKey}.eyebrow`)}</Text>
        <Text style={styles.offerTitle}>{t(`homeOffers.${translationKey}.title`)}</Text>
        <Text style={styles.offerBody}>{t(`homeOffers.${translationKey}.body`)}</Text>
        <View style={styles.offerAction}>
          <Text style={styles.offerActionText}>{t(`homeOffers.${translationKey}.action`)}</Text>
          <MaterialIcons name="arrow-forward" size={15} color={palette.surface} />
        </View>
      </View>
      <View style={[styles.offerIconWrap, { backgroundColor: banner.accent }]}>
        <MaterialIcons name={banner.icon} size={34} color={banner.color} />
      </View>
    </Pressable>
  );
}

function ActionCard({ action }: { action: WalletAction }) {
  const router = useRouter();
  const { t } = useTranslation();
  const route = actionRoutes[action.title];
  const title = t(actionTitleKeys[action.title] ?? action.title);
  const subtitle = t(actionSubtitleKeys[action.title] ?? action.subtitle);

  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
      onPress={route ? () => router.push(route) : undefined}
      accessibilityRole="button">
      <View style={[styles.actionIcon, { backgroundColor: action.tone }]}>
        <MaterialIcons name={action.icon} size={24} color={action.color} />
      </View>
      {route ? (
        <View style={styles.actionArrow}>
          <MaterialIcons name="arrow-forward" size={15} color={action.color} />
        </View>
      ) : null}
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function SponsorBadge({ sponsor }: { sponsor: Sponsor }) {
  return (
    <Pressable style={[styles.sponsorCard, { backgroundColor: sponsor.tone }]} accessibilityRole="button">
      <View style={[styles.sponsorMark, { backgroundColor: sponsor.color }]}>
        <Text style={styles.sponsorMarkText}>{sponsor.mark}</Text>
      </View>
      <Text style={styles.sponsorName}>{sponsor.name}</Text>
    </Pressable>
  );
}

function ServiceTile({ service }: { service: WalletAction }) {
  const router = useRouter();
  const { t } = useTranslation();
  const route = actionRoutes[service.title];
  const title = t(actionTitleKeys[service.title] ?? service.title);

  return (
    <Pressable
      style={({ pressed }) => [styles.serviceTile, pressed && route && styles.serviceTilePressed]}
      onPress={route ? () => router.push(route) : undefined}
      accessibilityRole="button">
      <View style={[styles.serviceIcon, { backgroundColor: service.tone }]}>
        <MaterialIcons name={service.icon} size={22} color={service.color} />
      </View>
      <Text style={styles.serviceTitle}>{title}</Text>
      {route ? <MaterialIcons name="chevron-right" size={20} color={palette.muted} /> : null}
    </Pressable>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isCredit = transaction.amount > 0;

  return (
    <Pressable style={styles.transactionRow} accessibilityRole="button">
      <View style={[styles.transactionIcon, { backgroundColor: transaction.tone }]}>
        <MaterialIcons name={transaction.icon} size={21} color={transaction.color} />
      </View>
      <View style={styles.transactionCopy}>
        <Text style={styles.transactionTitle}>{transaction.title}</Text>
        <Text style={styles.transactionMeta}>{transaction.meta}</Text>
      </View>
      <View style={styles.transactionAmountWrap}>
        <Text style={[styles.transactionAmount, isCredit && styles.creditAmount]}>
          {formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.transactionTime}>{transaction.time}</Text>
      </View>
    </Pressable>
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  greeting: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 5,
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
  balanceCard: {
    backgroundColor: palette.primary,
    borderRadius: 8,
    padding: 18,
    gap: 14,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  balanceLabel: {
    color: '#D8F4EA',
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    backgroundColor: '#DDF5EC',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  verifiedText: {
    color: palette.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  balanceAmount: {
    color: palette.surface,
    fontSize: 32,
    fontWeight: '900',
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primaryDark,
    borderRadius: 8,
    padding: 12,
    gap: 15,
  },
  balanceDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  balanceMetaLabel: {
    color: '#BFE4DA',
    fontSize: 11,
    fontWeight: '700',
  },
  balanceMetaValue: {
    color: palette.surface,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 3,
  },
  pendingShortcut: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  pendingShortcutPressed: {
    transform: [{ scale: 0.99 }],
  },
  pendingShortcutIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softAmber,
  },
  pendingShortcutCopy: {
    flex: 1,
  },
  pendingShortcutTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  pendingShortcutMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  pendingShortcutCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softAmber,
    paddingHorizontal: 8,
  },
  pendingShortcutCountText: {
    color: palette.amber,
    fontSize: 13,
    fontWeight: '900',
  },
  offerSlider: {
    gap: 10,
  },
  offerBanner: {
    minHeight: 142,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 8,
    padding: 16,
    overflow: 'hidden',
  },
  offerCopy: {
    flex: 1,
  },
  offerEyebrow: {
    alignSelf: 'flex-start',
    color: palette.primaryDark,
    backgroundColor: '#DDF5EC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '900',
  },
  offerTitle: {
    color: palette.surface,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 10,
  },
  offerBody: {
    color: '#CFE0DB',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 6,
  },
  offerAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  offerActionText: {
    color: palette.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  offerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  offerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.border,
  },
  offerDotActive: {
    width: 18,
    backgroundColor: palette.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionLink: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    minHeight: 138,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    position: 'relative',
  },
  actionCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  actionArrow: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceAlt,
  },
  actionTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  actionSubtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  sponsorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sponsorCard: {
    width: '22.7%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 8,
  },
  sponsorMark: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorMarkText: {
    color: palette.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  sponsorName: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceTile: {
    width: '48%',
    minHeight: 82,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceTilePressed: {
    transform: [{ scale: 0.98 }],
  },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    flex: 1,
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  transactionList: {
    gap: 10,
  },
  transactionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    gap: 10,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionCopy: {
    flex: 1,
  },
  transactionTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  transactionMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  transactionAmountWrap: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  creditAmount: {
    color: palette.primary,
  },
  transactionTime: {
    color: palette.muted,
    fontSize: 10,
    marginTop: 4,
  },
  addBalanceButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  addBalanceButtonPressed: {
    opacity: 0.85,
  },
  addBalanceButtonText: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
});

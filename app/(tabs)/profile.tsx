import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatCurrency, palette, type WalletIconName } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';
import { useSavedPaymentMethods } from '@/hooks/use-saved-payment-methods';
import { useWalletData } from '@/hooks/use-wallet-data';

type AccountRow = {
  color: string;
  icon: WalletIconName;
  metaKey: string;
  metaOptions?: Record<string, number>;
  route?: Href;
  titleKey: string;
  tone: string;
};

const accountRows: AccountRow[] = [
  {
    titleKey: 'profilePage.personalInformation',
    metaKey: 'profilePage.nidVerified',
    route: '/personal-information' as const,
    icon: 'account-circle' as WalletIconName,
    color: palette.primary,
    tone: palette.softGreen,
  },
  {
    titleKey: 'profilePage.security',
    metaKey: 'profilePage.pinAndBiometrics',
    icon: 'fingerprint' as WalletIconName,
    color: palette.cyan,
    tone: palette.softCyan,
  },
  {
    titleKey: 'profilePage.cardsBanks',
    metaKey: 'profilePage.linkedAccounts',
    route: '/payment-methods' as Href,
    icon: 'credit-card' as WalletIconName,
    color: palette.coral,
    tone: palette.softCoral,
  },
  {
    titleKey: 'profilePage.supportCenter',
    metaKey: 'profilePage.ticketsAndChat',
    route: '/support' as const,
    icon: 'support-agent' as WalletIconName,
    color: palette.amber,
    tone: palette.softAmber,
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account, logout } = useAuth();
  const { paymentMethods } = useSavedPaymentMethods(account?.uid);
  const { summary } = useWalletData(account?.uid);
  const profileName = account?.name || t('profilePage.defaultName');
  const profileEmail = account?.email || t('profilePage.noEmail');
  const profileInitials = account?.initials || 'TP';
  const monthlyLimit = summary?.monthlyLimit ?? 150000;
  const monthlyUsed = summary?.monthlyUsed ?? 0;
  const usedPercent = monthlyLimit > 0
    ? Math.min(Math.round((monthlyUsed / monthlyLimit) * 100), 100)
    : 0;

  function handleSignOut() {
    logout();
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{t('profilePage.kicker')}</Text>
            <Text style={styles.title}>{t('profilePage.title')}</Text>
          </View>
          <Pressable style={styles.iconButton} accessibilityRole="button">
            <MaterialIcons name="edit" size={22} color={palette.ink} />
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profileInitials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profilePhone}>{profileEmail}</Text>
            <View style={styles.profileBadge}>
              <MaterialIcons name="check-circle" size={14} color={palette.primary} />
              <Text style={styles.profileBadgeText}>{t('profilePage.verifiedWallet')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.limitPanel}>
          <View style={styles.limitTop}>
            <Text style={styles.limitTitle}>{t('profilePage.monthlyTransferLimit')}</Text>
            <Text style={styles.limitAmount}>{formatCurrency(monthlyLimit).replace('.00', '')}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${usedPercent}%` }]} />
          </View>
          <View style={styles.limitBottom}>
            <Text style={styles.limitMeta}>
              {t('profilePage.usedAmount', { amount: formatCurrency(monthlyUsed).replace('BDT ', '') })}
            </Text>
            <Text style={styles.limitMeta}>{usedPercent}%</Text>
          </View>
          <Text style={styles.limitAvailable}>
            {t('profilePage.availableAmount', {
              amount: formatCurrency(Math.max(monthlyLimit - monthlyUsed, 0)).replace('BDT ', ''),
            })}
          </Text>
        </View>

        <View style={styles.securityRow}>
          <Pressable
            style={styles.securityCardPressable}
            onPress={() => router.push('/pin-change')}
            accessibilityRole="button">
            <SecurityCard title={t('profilePage.pin')} meta={t('generic.active')} icon="lock" color={palette.primary} />
          </Pressable>
          <Pressable
            style={styles.securityCardPressable}
            onPress={() => router.push('/device-management')}
            accessibilityRole="button">
            <SecurityCard title={t('profilePage.device')} meta={t('generic.trusted')} icon="shield" color={palette.cyan} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>{t('profilePage.account')}</Text>
        <View style={styles.accountList}>
          {accountRows.map((row) => (
            <Pressable
              key={row.titleKey}
              style={styles.accountRow}
              onPress={() => row.route && router.push(row.route)}
              accessibilityRole="button">
              <View style={[styles.accountIcon, { backgroundColor: row.tone }]}>
                <MaterialIcons name={row.icon} size={22} color={row.color} />
              </View>
              <View style={styles.accountCopy}>
                <Text style={styles.accountTitle}>{t(row.titleKey)}</Text>
                <Text style={styles.accountMeta}>
                  {t(row.metaKey, row.titleKey === 'profilePage.cardsBanks' ? { count: paymentMethods.length } : row.metaOptions)}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={palette.muted} />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logoutButton} onPress={handleSignOut} accessibilityRole="button">
          <MaterialIcons name="logout" size={20} color={palette.danger} />
          <Text style={styles.logoutText}>{t('profilePage.signOut')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SecurityCard({
  title,
  meta,
  icon,
  color,
}: {
  title: string;
  meta: string;
  icon: WalletIconName;
  color: string;
}) {
  return (
    <View style={styles.securityCard}>
      <MaterialIcons name={icon} size={24} color={color} />
      <Text style={styles.securityTitle}>{title}</Text>
      <Text style={styles.securityMeta}>{meta}</Text>
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
  profileCard: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
  },
  avatarText: {
    color: palette.surface,
    fontSize: 20,
    fontWeight: '900',
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  profilePhone: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  profileBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.softGreen,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 10,
  },
  profileBadgeText: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  limitPanel: {
    backgroundColor: palette.primary,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  limitTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  limitTitle: {
    flex: 1,
    color: '#D8F4EA',
    fontSize: 13,
    fontWeight: '800',
  },
  limitAmount: {
    color: palette.surface,
    fontSize: 16,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: palette.primaryDark,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.amber,
  },
  limitBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  limitMeta: {
    color: '#D8F4EA',
    fontSize: 12,
    fontWeight: '800',
  },
  limitAvailable: {
    color: palette.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  securityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  securityCardPressable: {
    flex: 1,
  },
  securityCard: {
    flex: 1,
    minHeight: 100,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    justifyContent: 'center',
  },
  securityTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },
  securityMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  accountList: {
    gap: 10,
  },
  accountRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCopy: {
    flex: 1,
  },
  accountTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  accountMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  logoutButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  logoutText: {
    color: palette.danger,
    fontSize: 15,
    fontWeight: '900',
  },
});

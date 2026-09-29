import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useIsFocused } from '@react-navigation/native';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import WalletMiniLogo from '@/components/WalletMiniLogo';
import { formatCurrency, palette, type WalletIconName } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';
import { useWalletData } from '@/hooks/use-wallet-data';

type HomeService = { label: string; icon: WalletIconName; color: string; route: Href };
const services: HomeService[] = [
  { label: 'home.mobileRecharge', icon: 'phone-android', color: '#53977D', route: '/mobile-recharge' },
  { label: 'home.addBalance', icon: 'add-card', color: '#994AB0', route: '/add-balance' },
  { label: 'home.electricityBill', icon: 'electric-bolt', color: '#527E78', route: '/bill-pay' },
  { label: 'home.internetBill', icon: 'router', color: '#D847A0', route: '/bill-pay' },
  { label: 'home.recentActivity', icon: 'receipt-long', color: '#AE805F', route: '/(tabs)/activity' },
  { label: 'homeDesign.paymentMethods', icon: 'account-balance', color: '#EA648D', route: '/payment-methods' },
  { label: 'home.pendingTransactions', icon: 'pending-actions', color: '#6787C4', route: '/pending-transactions' },
  { label: 'homeDesign.security', icon: 'verified-user', color: '#31ACCE', route: '/device-management' },
  { label: 'common.support', icon: 'support-agent', color: '#7B78B4', route: '/support' },
];
const partners = [
  { name: 'bKash', mark: 'bK', color: '#E2136E' },
  { name: 'Nagad', mark: 'Ng', color: '#F08019' },
  { name: 'Rocket', mark: 'Rk', color: '#8A3296' },
];

export default function HomeScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { summary, pendingTransactions, isLoading, error } = useWalletData(account?.uid);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');
  const filteredServices = services.filter(service => t(service.label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const visibleServices = query.trim() ? filteredServices : services.slice(0, expanded ? services.length : 8);

  function ServiceButton({ service, quick = false }: { service: HomeService; quick?: boolean }) {
    return (
      <Pressable onPress={() => router.push(service.route)} accessibilityRole="button"
        style={({ pressed }) => [quick ? styles.quickTile : styles.service, pressed && styles.pressed]}>
        <View style={[
          styles.serviceIcon,
          quick && styles.quickIcon,
          service.label === 'home.mobileRecharge' && styles.mobileRechargeIcon,
        ]}>
          {service.label === 'home.mobileRecharge' ? (
            <Image
              source={require('../../assets/mobilerecharge.png')}
              resizeMode="contain"
              style={{ width: quick ? 36 : 46, height: quick ? 36 : 46 }}
            />
          ) : (
            <MaterialIcons name={service.icon} size={quick ? 26 : 31} color={service.color} />
          )}
        </View>
        <Text style={[styles.serviceLabel, quick && styles.quickLabel]}>{t(service.label)}</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {isFocused ? <StatusBar style="light" /> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View pointerEvents="none" style={styles.headerArt}>
            <View style={styles.headerBlockOne} /><View style={styles.headerBlockTwo} /><View style={styles.headerBlockThree} />
          </View>
          <View style={styles.profileRow}>
            <Pressable style={styles.avatar} onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button" accessibilityLabel={t('common.profile')}>
              <Text style={styles.avatarText}>{account?.initials || 'TP'}</Text>
            </Pressable>
            <View style={styles.profileCopy}>
              <Text style={styles.name} numberOfLines={1}>{account?.name || 'Toppay'}</Text>
              <Pressable style={styles.balanceButton} onPress={() => setBalanceVisible(value => !value)} accessibilityRole="button"
                accessibilityLabel={balanceVisible ? t('homeDesign.hideBalance') : t('homeDesign.showBalance')}>
                <View style={styles.currencyBadge}><Text style={styles.currencyText}>৳</Text></View>
                <Text style={styles.balanceText} numberOfLines={1}>
                  {balanceVisible ? (isLoading ? t('common.loading') : error || !summary ? t('homeDesign.balanceUnavailable') : formatCurrency(summary.balance)) : t('homeDesign.showBalance')}
                </Text>
              </Pressable>
            </View>
            <Pressable style={styles.headerButton} onPress={() => { setSearchVisible(value => !value); setQuery(''); }} accessibilityRole="button" accessibilityLabel={t('common.search')} accessibilityState={{ expanded: searchVisible }}>
              <MaterialIcons name={searchVisible ? 'close' : 'search'} size={25} color={palette.primary} />
            </Pressable>
            <Pressable style={styles.headerOutlineButton} onPress={() => router.push('/pending-transactions')} accessibilityRole="button" accessibilityLabel={t('home.pendingTransactions')}>
              <MaterialIcons name="notifications-none" size={25} color="#FFFFFF" />
              {pendingTransactions.length > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{pendingTransactions.length}</Text></View> : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionCopy}>
              <Text style={styles.partnerHeading}>{t('homeDesign.paymentServices')}</Text>
              <Text style={styles.caption}>{t('homeDesign.paymentHint')}</Text>
            </View>
            <Pressable style={styles.smallPill} onPress={() => router.push('/payment-methods')} accessibilityRole="button">
              <Text style={styles.smallPillText}>{t('common.manage', { defaultValue: t('common.edit') })}</Text>
            </Pressable>
          </View>
          <View style={styles.partners}>
            {partners.map(partner => (
              <Pressable key={partner.name} style={({ pressed }) => [styles.partner, pressed && styles.pressed]} onPress={() => router.push({ pathname: '/provider-actions', params: { provider: partner.name } })} accessibilityRole="button" accessibilityLabel={partner.name}>
                <WalletMiniLogo {...partner} size={46} style={styles.partnerLogo} />
                <Text style={[styles.partnerLabel, { color: partner.color }]}>{partner.name}</Text>
              </Pressable>
            ))}
            <Pressable style={({ pressed }) => [styles.partner, pressed && styles.pressed]} onPress={() => router.push({ pathname: '/provider-actions', params: { provider: 'Bank' } })} accessibilityRole="button">
              <View style={styles.bankIcon}><MaterialIcons name="account-balance" size={29} color="#558C80" /></View>
              <Text style={[styles.partnerLabel, { color: '#558C80' }]}>{t('homeDesign.bank')}</Text>
            </Pressable>
          </View>

          {searchVisible ? <TextInput style={styles.searchInput} placeholder={t('homeDesign.searchServices')} placeholderTextColor={palette.muted} value={query} onChangeText={setQuery} autoFocus accessibilityLabel={t('homeDesign.searchServices')} /> : null}
          <View style={styles.serviceGrid}>
            {visibleServices.map(service => <ServiceButton key={service.label} service={service} />)}
          </View>
          {query.trim() && visibleServices.length === 0 ? <Text style={styles.emptyText}>{t('homeDesign.noServices')}</Text> : null}
          {!query.trim() ? (
            <>
              {!expanded ? <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.previewRow}>
                {services.slice(8).map(service => <View key={service.label} style={styles.previewIcon}><MaterialIcons name={service.icon} size={30} color={service.color} /></View>)}
              </View> : null}
              <Pressable style={styles.expandButton} onPress={() => setExpanded(value => !value)} accessibilityRole="button" accessibilityState={{ expanded }}>
                <Text style={styles.expandText}>{t(expanded ? 'homeDesign.showLess' : 'homeDesign.showMore')}</Text>
                <MaterialIcons name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={18} color={palette.primary} />
              </Pressable>
            </>
          ) : null}

          <Pressable style={({ pressed }) => [styles.banner, pressed && styles.pressed]} onPress={() => router.push('/(tabs)/services')} accessibilityRole="button">
            <View pointerEvents="none" style={styles.bannerStripe} />
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>{t('homeDesign.bannerTitle')}</Text>
              <Text style={styles.bannerSubtitle}>{t('homeDesign.bannerSubtitle')}</Text>
            </View>
            <View style={styles.bannerRight}>
              <Text style={styles.bannerBrand}>Toppay!</Text>
              <View style={styles.bannerCta}><Text style={styles.bannerCtaText}>{t('homeDesign.explore')}</Text><MaterialIcons name="arrow-forward" size={13} color="#FFFFFF" /></View>
            </View>
          </Pressable>

          <Text style={styles.quickHeading}>{t('home.quickActions')}</Text>
          <View style={styles.quickRow}>{services.slice(0, 3).map(service => <ServiceButton key={service.label} service={service} quick />)}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.primary },
  scroll: { flexGrow: 1 },
  header: { minHeight: 153, backgroundColor: palette.primary, overflow: 'hidden', paddingHorizontal: 18, paddingTop: 25, paddingBottom: 42 },
  headerArt: { ...StyleSheet.absoluteFillObject },
  headerBlockOne: { position: 'absolute', width: '65%', height: 110, backgroundColor: '#ED4A93', left: '-8%', top: -30, transform: [{ rotate: '-12deg' }] },
  headerBlockTwo: { position: 'absolute', width: '38%', height: 100, backgroundColor: '#EE70AA', left: '34%', top: 82, transform: [{ rotate: '-8deg' }] },
  headerBlockThree: { position: 'absolute', width: '35%', height: 120, backgroundColor: '#C6095C', right: -25, top: 28, transform: [{ rotate: '12deg' }] },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#FFD4E8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.primary, fontSize: 20, fontWeight: '600' },
  profileCopy: { flex: 1, gap: 7 },
  name: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  balanceButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 4, gap: 7, alignSelf: 'flex-start', maxWidth: '100%', minHeight: 32 },
  currencyBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  currencyText: { color: '#FFFFFF', fontSize: 17 },
  balanceText: { color: '#555555', fontSize: 11, paddingRight: 9, flexShrink: 1 },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerOutlineButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -3, top: -5, backgroundColor: '#FFFFFF', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: palette.primary, fontSize: 10, fontWeight: '700' },
  sheet: { flexGrow: 1, marginTop: -24, backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 24, paddingBottom: 30 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionCopy: { flex: 1 },
  partnerHeading: { color: '#303030', fontSize: 15, fontWeight: '600' },
  caption: { color: '#888888', fontSize: 11, marginTop: 5, lineHeight: 16 },
  smallPill: { minHeight: 36, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#FDE7F0', justifyContent: 'center' },
  smallPillText: { color: palette.primary, fontSize: 11 },
  partners: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  partner: { flex: 1, minHeight: 91, borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 14, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 10 },
  partnerLogo: { borderWidth: 0, borderRadius: 23, backgroundColor: '#F9EEF4' },
  partnerLabel: { fontSize: 10, fontWeight: '500' },
  bankIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EFF4F2', alignItems: 'center', justifyContent: 'center' },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  service: { width: '25%', alignItems: 'center', paddingHorizontal: 3, paddingVertical: 8, gap: 10, minHeight: 105 },
  serviceIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#F6F6F6', justifyContent: 'center', alignItems: 'center' },
  mobileRechargeIcon: { backgroundColor: 'transparent' },
  serviceLabel: { fontSize: 11, color: '#444444', textAlign: 'center', lineHeight: 16 },
  pressed: { opacity: 0.65 },
  previewRow: { flexDirection: 'row', marginTop: 14, opacity: 0.16 },
  previewIcon: { width: '25%', height: 40, alignItems: 'center', justifyContent: 'center' },
  expandButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 40, paddingHorizontal: 18, borderWidth: 1, borderColor: '#EBEBEB', borderRadius: 9, marginTop: 14, marginBottom: 26 },
  expandText: { color: palette.primary, fontSize: 12 },
  banner: { minHeight: 138, borderRadius: 12, backgroundColor: '#650571', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12, marginTop: 4 },
  bannerStripe: { position: 'absolute', width: 100, height: 300, backgroundColor: '#8C087F', transform: [{ rotate: '35deg' }], left: '45%', top: -80 },
  bannerCopy: { flex: 1 },
  bannerTitle: { color: '#FFFFFF', fontSize: 23, lineHeight: 28, fontWeight: '700' },
  bannerSubtitle: { color: '#F9D6EF', fontSize: 11, lineHeight: 17, marginTop: 8 },
  bannerRight: { alignItems: 'flex-end', gap: 12 },
  bannerBrand: { color: '#FFE82C', fontWeight: '900', fontSize: 25 },
  bannerCta: { borderWidth: 1, borderColor: '#E9B6DB', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 4, flexDirection: 'row', gap: 5, alignItems: 'center' },
  bannerCtaText: { color: '#FFFFFF', fontSize: 10 },
  quickHeading: { color: '#444444', fontSize: 19, marginTop: 26, marginBottom: 16 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickTile: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 5, gap: 9 },
  quickIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FAFAFA' },
  quickLabel: { fontSize: 10 },
  searchInput: { borderWidth: 1, borderColor: palette.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, color: palette.ink, fontSize: 14 },
  emptyText: { color: palette.muted, paddingVertical: 20, textAlign: 'center' },
});

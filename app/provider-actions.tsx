import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WalletMiniLogo from '@/components/WalletMiniLogo';
import { palette, type WalletIconName } from '@/constants/toppay';

const providers = {
  bKash: { color: '#E2136E', mark: 'bK' },
  Nagad: { color: '#F08019', mark: 'Ng' },
  Rocket: { color: '#8A3296', mark: 'Rk' },
  Bank: { color: '#558C80', mark: 'BK' },
};
export default function ProviderActionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ provider?: string }>();
  const provider = Object.prototype.hasOwnProperty.call(providers, params.provider ?? '') ? params.provider as keyof typeof providers : 'bKash';
  const brand = providers[provider];
  const actions: { label: string; icon: WalletIconName; route: Href; disabled?: boolean; hint?: string }[] = [
    { label: 'home.sendMoney', icon: 'send', route: { pathname: '/send-money', params: { provider } }, disabled: provider === 'Bank', hint: provider === 'Bank' ? 'providerActions.mobileOnly' : undefined },
    { label: 'home.cashOut', icon: 'payments', route: { pathname: '/cash-out', params: { provider } } },
    { label: 'providerActions.payment', icon: 'receipt-long', route: '/bill-pay', hint: 'providerActions.paymentHint' },
    { label: 'home.addBalance', icon: 'add-card', route: { pathname: '/add-balance', params: { provider } } },
  ];
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t('common.back')}><MaterialIcons name="arrow-back" size={25} color={palette.primary} /></Pressable>
        <Text style={styles.title}>{provider === 'Bank' ? t('homeDesign.bank') : provider}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.brand}>
          {provider === 'Bank' ? <MaterialIcons name="account-balance" size={44} color={brand.color} /> : <WalletMiniLogo name={provider} {...brand} size={68} />}
          <Text style={styles.heading}>{t('providerActions.title')}</Text>
        </View>
        <View style={styles.actions}>
          {actions.map(action => <Pressable key={action.label} disabled={action.disabled} onPress={() => router.push(action.route)} accessibilityRole="button" accessibilityState={{ disabled: Boolean(action.disabled) }} style={({ pressed }) => [styles.action, action.disabled && styles.disabled, pressed && styles.pressed]}>
            <View style={styles.icon}><MaterialIcons name={action.icon} size={25} color={palette.primary} /></View>
            <View style={styles.copy}><Text style={styles.label}>{t(action.label)}</Text>{action.hint ? <Text style={styles.hint}>{t(action.hint)}</Text> : null}</View>
            <MaterialIcons name={action.disabled ? 'lock-outline' : 'chevron-right'} size={22} color={palette.muted} />
          </Pressable>)}
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 21, fontWeight: '600', color: palette.ink },
  content: { paddingHorizontal: 22, flex: 1 }, brand: { alignItems: 'center', gap: 18, paddingVertical: 22 }, heading: { fontSize: 20, color: palette.ink, textAlign: 'center' }, actions: { gap: 12 }, action: { flexDirection: 'row', alignItems: 'center', minHeight: 76, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, gap: 12 }, icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.softPrimary }, copy: { flex: 1 }, label: { fontSize: 16, fontWeight: '600', color: palette.ink }, hint: { fontSize: 11, lineHeight: 16, marginTop: 4, color: palette.muted }, disabled: { opacity: 0.55 }, pressed: { backgroundColor: palette.softPrimary },
});

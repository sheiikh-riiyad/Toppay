import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { billers, palette, serviceCatalog, type WalletAction } from '@/constants/toppay';

const serviceRoutes: Record<string, Href> = {
  'Send Money': '/send-money',
  'Cash Out': '/cash-out',
  Recharge: '/mobile-recharge',
  Payment: '/bill-pay',
  Electricity: '/bill-pay',
  Internet: '/bill-pay',
  'Add Balance': '/add-balance',
};

const serviceTitleKeys: Record<string, string> = {
  'Send Money': 'home.sendMoney',
  'Cash Out': 'home.cashOut',
  Recharge: 'home.mobileRecharge',
  Payment: 'home.payBills',
  'Add Balance': 'home.addBalance',
  Rewards: 'home.rewards',
  Electricity: 'home.electricityBill',
  Internet: 'home.internetBill',
  Water: 'home.waterBill',
  Education: 'home.educationFee',
  Donation: 'home.donation',
};

export default function ServicesScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{t('servicesPage.kicker')}</Text>
            <Text style={styles.title}>{t('servicesPage.title')}</Text>
          </View>
          <Pressable style={styles.iconButton} accessibilityRole="button">
            <MaterialIcons name="support-agent" size={22} color={palette.ink} />
          </Pressable>
        </View>

        <View style={styles.featurePanel}>
          <View style={styles.featureIcon}>
            <MaterialIcons name="workspace-premium" size={28} color={palette.primary} />
          </View>
          <View style={styles.featureCopy}>
            <Text style={styles.featureTitle}>{t('servicesPage.goldWalletTier')}</Text>
            <Text style={styles.featureMeta}>{t('servicesPage.goldWalletMeta')}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={palette.primary} />
        </View>

        <Text style={styles.sectionTitle}>{t('servicesPage.popular')}</Text>
        <View style={styles.serviceGrid}>
          {serviceCatalog.map((service) => (
            <ServiceCard key={service.title} service={service} />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('servicesPage.pendingBills')}</Text>
          <Text style={styles.sectionLink}>{t('servicesPage.dueCount', { count: 3 })}</Text>
        </View>
        <View style={styles.billerList}>
          {billers.map((biller) => (
            <Pressable key={biller.name} style={styles.billerRow} accessibilityRole="button">
              <View style={styles.billerLeft}>
                <View style={styles.billerIcon}>
                  <MaterialIcons name={biller.icon} size={22} color={palette.primary} />
                </View>
                <View>
                  <Text style={styles.billerName}>{biller.name}</Text>
                  <Text style={styles.billerType}>{biller.type}</Text>
                </View>
              </View>
              <Text style={styles.billerDue}>{biller.due}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ServiceCard({ service }: { service: WalletAction }) {
  const router = useRouter();
  const { t } = useTranslation();
  const route = serviceRoutes[service.title];
  const title = t(serviceTitleKeys[service.title] ?? service.title);

  return (
    <Pressable
      style={({ pressed }) => [styles.serviceCard, pressed && route && styles.serviceCardPressed]}
      onPress={route ? () => router.push(route) : undefined}
      accessibilityRole="button">
      <View style={[styles.serviceIcon, { backgroundColor: service.tone }]}>
        <MaterialIcons name={service.icon} size={25} color={service.color} />
      </View>
      <Text style={styles.serviceTitle}>{title}</Text>
      <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
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
  featurePanel: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softGreen,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  featureMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
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
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    minHeight: 132,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  serviceCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  serviceTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  serviceSubtitle: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  billerList: {
    gap: 10,
  },
  billerRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  billerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  billerIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softGreen,
  },
  billerName: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  billerType: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  billerDue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
});

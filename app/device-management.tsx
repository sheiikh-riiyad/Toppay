import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, type WalletIconName } from '@/constants/toppay';

type Device = {
  id: string;
  name: string;
  type: 'phone' | 'tablet' | 'web';
  icon: WalletIconName;
  lastAccessed: string;
  platform: string;
  appVersion: string;
  appBuild: string;
  isCurrent: boolean;
};

function getPlatformLabel() {
  if (Platform.OS === 'android') {
    return `Android ${Platform.Version}`;
  }

  if (Platform.OS === 'ios') {
    return `iOS ${Platform.Version}`;
  }

  return 'Web';
}

function getCurrentDevice(t: (key: string) => string): Device {
  const deviceName = Constants.deviceName || (
    Platform.OS === 'android'
      ? 'Android device'
      : Platform.OS === 'ios'
        ? 'iPhone'
        : 'Web browser'
  );
  const type = Platform.OS === 'web' ? 'web' : 'phone';

  return {
    id: 'current-device',
    name: deviceName,
    type,
    icon: type === 'web' ? 'desktop-mac' : 'smartphone',
    lastAccessed: t('deviceManagement.justNow'),
    platform: getPlatformLabel(),
    appVersion: Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0',
    appBuild: Constants.appOwnership || t('deviceManagement.installedApp'),
    isCurrent: true,
  };
}

export default function DeviceManagementScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const currentDevice = getCurrentDevice(t);
  const devices = [currentDevice];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('generic.security')}</Text>
            <Text style={styles.title}>{t('deviceManagement.title')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="devices" size={17} color={palette.primary} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="devices-other" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('deviceManagement.yourDevices')}</Text>
            <Text style={styles.heroMeta}>{t('deviceManagement.devicesLoggedIn', { count: devices.length })}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={18} color={palette.cyan} />
          <Text style={styles.infoText}>{t('deviceManagement.currentDeviceOnly')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('deviceManagement.activeDevices')}</Text>
        <View style={styles.deviceList}>
          {devices.map((device) => (
            <View key={device.id} style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceIconWrapper}>
                  <MaterialIcons name={device.icon} size={24} color={palette.primary} />
                </View>
                <View style={styles.deviceInfo}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    {device.isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>{t('deviceManagement.currentDevice')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.deviceMeta}>{device.platform}</Text>
                </View>
              </View>

              <View style={styles.deviceDetails}>
                <DetailItem icon="access-time" label={t('deviceManagement.lastAccessed')} value={device.lastAccessed} />
                <DetailItem icon="system-update" label={t('deviceManagement.appVersion')} value={device.appVersion} />
                <DetailItem icon="verified-user" label={t('deviceManagement.appBuild')} value={device.appBuild} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.securityTipsCard}>
          <View style={styles.securityTipsHeader}>
            <MaterialIcons name="security" size={20} color={palette.primary} />
            <Text style={styles.securityTipsTitle}>{t('generic.securityTips')}</Text>
          </View>
          <View style={styles.tipsList}>
            <TipItem text={t('deviceManagement.reviewDevices')} />
            <TipItem text={t('security.signOutUnknown')} />
            <TipItem text={t('deviceManagement.useStrongSecurity')} />
            <TipItem text={t('deviceManagement.enableBiometric')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailItem({ icon, label, value }: { icon: WalletIconName; label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailItemIcon}>
        <MaterialIcons name={icon} size={16} color={palette.muted} />
      </View>
      <View style={styles.detailItemContent}>
        <Text style={styles.detailItemLabel}>{label}</Text>
        <Text style={styles.detailItemValue}>{value}</Text>
      </View>
    </View>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <View style={styles.tipItem}>
      <View style={styles.tipBullet} />
      <Text style={styles.tipText}>{text}</Text>
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
    color: palette.primary,
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
    backgroundColor: palette.softGreen,
  },
  heroCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.primary,
    borderRadius: 8,
    padding: 15,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryDark,
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
    color: '#CBECE2',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.softCyan,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3F5F7',
    padding: 14,
  },
  infoText: {
    flex: 1,
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  deviceList: {
    gap: 12,
  },
  deviceCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  deviceIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softGreen,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  currentBadge: {
    backgroundColor: palette.softGreen,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentBadgeText: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  deviceMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  deviceDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.background,
    borderRadius: 6,
    padding: 10,
  },
  detailItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softNeutral,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  detailItemValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  signOutButton: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(209, 73, 63, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  signOutButtonText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  securityTipsCard: {
    backgroundColor: palette.softGreen,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(14, 128, 101, 0.2)',
    padding: 14,
    gap: 12,
  },
  securityTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityTipsTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  tipsList: {
    gap: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.primary,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});

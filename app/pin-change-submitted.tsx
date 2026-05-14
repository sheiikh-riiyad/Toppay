import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/toppay';

export default function PinChangeSubmittedScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  function handleBackToProfile() {
    router.replace('/(tabs)/profile');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <MaterialIcons name="check-circle" size={80} color={palette.primary} />
        </View>

        <View style={styles.successCard}>
          <Text style={styles.successTitle}>{t('pinPage.submittedTitle')}</Text>
          <Text style={styles.successMeta}>{t('pinPage.submittedMeta')}</Text>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow label={t('generic.action')} value={t('pinPage.submittedTitle')} />
          <DetailDivider />
          <DetailRow label={t('pinPage.updated')} value={t('pinPage.justNow')} />
          <DetailDivider />
          <DetailRow label={t('generic.status')} value={t('generic.active')} strong />
        </View>

        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <MaterialIcons name="lightbulb" size={22} color={palette.amber} />
            <Text style={styles.tipsTitle}>{t('generic.securityTips')}</Text>
          </View>
          <View style={styles.tipsList}>
            <TipItem text={t('security.neverSharePin')} />
            <TipItem text={t('security.useStrongPin')} />
            <TipItem text={t('security.changePinRegularly')} />
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <MaterialIcons name="info" size={20} color={palette.cyan} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>{t('pinPage.newPinActive')}</Text>
            <Text style={styles.infoMeta}>
              {t('pinPage.newPinActiveMeta')}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={handleBackToProfile}
          accessibilityRole="button">
          <MaterialIcons name="account-circle" size={18} color={palette.surface} />
          <Text style={styles.primaryButtonText}>{t('generic.backToProfile')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, strong && styles.detailValueStrong]}>
        {value}
      </Text>
    </View>
  );
}

function DetailDivider() {
  return <View style={styles.detailDivider} />;
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
    gap: 18,
    alignItems: 'center',
  },
  successIcon: {
    marginTop: 20,
    marginBottom: 12,
  },
  successCard: {
    alignItems: 'center',
  },
  successTitle: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  successMeta: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  detailValue: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  detailValueStrong: {
    color: palette.primary,
    fontSize: 15,
  },
  tipsCard: {
    width: '100%',
    backgroundColor: palette.softAmber,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE8C7',
    padding: 14,
    gap: 12,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipsTitle: {
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.amber,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: palette.softCyan,
    borderRadius: 8,
    padding: 14,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 157, 178, 0.1)',
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  infoMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 16,
  },
  primaryButton: {
    width: '100%',
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

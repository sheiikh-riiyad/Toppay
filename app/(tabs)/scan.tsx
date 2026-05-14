import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/toppay';

const merchants = [
  { name: 'Coffee Mart', code: 'CM-4218', color: palette.coral },
  { name: 'Fresh Basket', code: 'FB-1740', color: palette.primary },
  { name: 'Metro Pharmacy', code: 'MP-9021', color: palette.cyan },
];

export default function ScanScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{t('scanPage.kicker')}</Text>
            <Text style={styles.title}>{t('scanPage.title')}</Text>
          </View>
          <Pressable style={styles.iconButton} accessibilityRole="button">
            <MaterialIcons name="flash-on" size={22} color={palette.ink} />
          </Pressable>
        </View>

        <View style={styles.scannerCard}>
          <Corner style={styles.cornerTopLeft} />
          <Corner style={styles.cornerTopRight} />
          <Corner style={styles.cornerBottomLeft} />
          <Corner style={styles.cornerBottomRight} />
          <View style={styles.scanIconWrap}>
            <MaterialIcons name="qr-code-scanner" size={78} color={palette.primary} />
          </View>
          <Text style={styles.scanTitle}>{t('scanPage.qrTitle')}</Text>
          <Text style={styles.scanMeta}>{t('scanPage.qrMeta')}</Text>
        </View>

        <View style={styles.formBlock}>
          <Text style={styles.label}>{t('scanPage.merchantId')}</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="storefront" size={21} color={palette.muted} />
            <TextInput
              placeholder={t('scanPage.merchantCodePlaceholder')}
              placeholderTextColor={palette.muted}
              style={styles.input}
            />
          </View>
          <Text style={styles.label}>{t('generic.amount')}</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="payments" size={21} color={palette.muted} />
            <TextInput
              keyboardType="numeric"
              placeholder={t('scanPage.amountPlaceholder')}
              placeholderTextColor={palette.muted}
              style={styles.input}
            />
          </View>
          <Pressable style={styles.payButton} accessibilityRole="button">
            <MaterialIcons name="lock" size={18} color={palette.surface} />
            <Text style={styles.payButtonText}>{t('scanPage.paySecurely')}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('scanPage.recentMerchants')}</Text>
          <Text style={styles.sectionLink}>{t('scanPage.manage')}</Text>
        </View>
        <View style={styles.merchantList}>
          {merchants.map((merchant) => (
            <Pressable key={merchant.code} style={styles.merchantRow} accessibilityRole="button">
              <View style={[styles.merchantAvatar, { backgroundColor: merchant.color }]}>
                <MaterialIcons name="storefront" size={21} color={palette.surface} />
              </View>
              <View style={styles.merchantCopy}>
                <Text style={styles.merchantName}>{merchant.name}</Text>
                <Text style={styles.merchantCode}>{merchant.code}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={palette.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
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
  scannerCard: {
    height: 292,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    position: 'relative',
  },
  corner: {
    width: 42,
    height: 42,
    position: 'absolute',
    borderColor: palette.primary,
  },
  cornerTopLeft: {
    top: 20,
    left: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 20,
    right: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 20,
    left: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 20,
    right: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softGreen,
  },
  scanTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 18,
  },
  scanMeta: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  formBlock: {
    gap: 10,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  inputRow: {
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
  input: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  payButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: 8,
    marginTop: 6,
  },
  payButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
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
  merchantList: {
    gap: 10,
  },
  merchantRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    gap: 12,
  },
  merchantAvatar: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantCopy: {
    flex: 1,
  },
  merchantName: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  merchantCode: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
});

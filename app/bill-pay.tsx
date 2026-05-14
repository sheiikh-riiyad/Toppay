import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth';
import { useWalletData } from '@/hooks/use-wallet-data';
import {
  billPayBillers,
  formatCurrency,
  palette,
  type BillPayBiller,
  type BillPayCategory,
} from '@/constants/toppay';

const quickAmounts = ['500', '1000', '1500', '2000', '5000'];
const categories: BillPayCategory[] = ['electricity', 'internet'];
const billTypes = ['prepaid', 'postpaid'] as const;

function supportsPrepaidPostpaid(biller: BillPayBiller) {
  return biller.shortName === 'DESCO' || biller.shortName === 'NESCO';
}

export default function BillPayScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { summary } = useWalletData(account?.uid);
  const [selectedCategory, setSelectedCategory] = useState<BillPayCategory>('electricity');
  const categoryBillers = useMemo(
    () => billPayBillers.filter((biller) => biller.category === selectedCategory),
    [selectedCategory]
  );
  const [selectedBiller, setSelectedBiller] = useState<BillPayBiller>(
    () => billPayBillers.find((biller) => biller.category === 'electricity') ?? billPayBillers[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [billingId, setBillingId] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billType, setBillType] = useState<(typeof billTypes)[number]>('prepaid');
  const [amount, setAmount] = useState('1000');

  const filteredBillers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return categoryBillers;
    }

    return categoryBillers.filter((biller) => (
      biller.name.toLowerCase().includes(query)
      || biller.shortName.toLowerCase().includes(query)
    ));
  }, [categoryBillers, searchQuery]);
  const balance = summary?.balance ?? 0;
  const numericAmount = Number(amount) || 0;
  const remainingBalance = Math.max(balance - numericAmount, 0);
  const needsBillDate = selectedBiller.category === 'electricity';
  const needsBillType = supportsPrepaidPostpaid(selectedBiller);
  const canContinue = numericAmount > 0
    && billingId.trim().length >= 3
    && (!needsBillDate || billDate.trim().length >= 6)
    && Boolean(selectedBiller);

  function chooseCategory(category: BillPayCategory) {
    setSelectedCategory(category);
    setSearchQuery('');
    setSelectedBiller(billPayBillers.find((biller) => biller.category === category) ?? billPayBillers[0]);
  }

  function handleContinue() {
    router.push({
      pathname: '/bill-pay-confirmation',
      params: {
        billerName: selectedBiller.name,
        billerShortName: selectedBiller.shortName,
        billerCategory: selectedBiller.category,
        billingId: billingId.trim(),
        billDate: needsBillDate ? billDate.trim() : '',
        billType: needsBillType ? billType : '',
        amount,
      },
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('billPayPage.kicker')}</Text>
            <Text style={styles.title}>{t('billPayPage.title')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="receipt-long" size={20} color={palette.amber} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="payments" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('billPayPage.heroTitle')}</Text>
            <Text style={styles.heroMeta}>{t('billPayPage.balanceLine', { amount: formatCurrency(balance) })}</Text>
          </View>
        </View>

        <View style={styles.categoryTabs}>
          {categories.map((category) => {
            const active = category === selectedCategory;

            return (
              <Pressable
                key={category}
                style={[styles.categoryTab, active && styles.categoryTabActive]}
                onPress={() => chooseCategory(category)}
                accessibilityRole="button">
                <MaterialIcons
                  name={category === 'electricity' ? 'electric-bolt' : 'router'}
                  size={18}
                  color={active ? palette.surface : palette.muted}
                />
                <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
                  {t(`billPayPage.categories.${category}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('billPayPage.selectBiller')}</Text>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={palette.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('billPayPage.searchBiller')}
              placeholderTextColor={palette.muted}
              style={styles.searchInput}
            />
          </View>
          <ScrollView
            nestedScrollEnabled
            style={styles.billerScroll}
            contentContainerStyle={styles.billerList}
            showsVerticalScrollIndicator={false}>
            {filteredBillers.length === 0 ? (
              <Text style={styles.emptyText}>{t('billPayPage.noBillersFound')}</Text>
            ) : (
              filteredBillers.map((biller) => {
                const active = biller.name === selectedBiller.name;

                return (
                  <Pressable
                    key={biller.name}
                    style={[styles.billerRow, active && styles.billerRowActive]}
                    onPress={() => setSelectedBiller(biller)}
                    accessibilityRole="button">
                    <View style={[styles.billerIcon, { backgroundColor: biller.tone }]}>
                      <MaterialIcons name={biller.icon} size={22} color={biller.color} />
                    </View>
                    <View style={styles.billerCopy}>
                      <Text style={styles.billerName}>{biller.shortName}</Text>
                      <Text style={styles.billerMeta}>{biller.name}</Text>
                    </View>
                    {active ? <MaterialIcons name="check-circle" size={20} color={palette.amber} /> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('billPayPage.billingId')}</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="confirmation-number" size={21} color={palette.muted} />
            <TextInput
              value={billingId}
              onChangeText={setBillingId}
              placeholder={t('billPayPage.billingIdPlaceholder')}
              placeholderTextColor={palette.muted}
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>
          {needsBillDate ? (
            <View style={styles.inputRow}>
              <MaterialIcons name="event" size={21} color={palette.muted} />
              <TextInput
                value={billDate}
                onChangeText={setBillDate}
                placeholder={t('billPayPage.billDatePlaceholder')}
                placeholderTextColor={palette.muted}
                style={styles.input}
              />
            </View>
          ) : null}
          {needsBillType ? (
            <View style={styles.billTypeRow}>
              {billTypes.map((type) => {
                const active = billType === type;

                return (
                  <Pressable
                    key={type}
                    style={[styles.billTypeButton, active && styles.billTypeButtonActive]}
                    onPress={() => setBillType(type)}
                    accessibilityRole="button">
                    <Text style={[styles.billTypeText, active && styles.billTypeTextActive]}>
                      {t(`billPayPage.billTypes.${type}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.amountPanel}>
          <Text style={styles.panelTitle}>{t('generic.amount')}</Text>
          <View style={styles.amountBox}>
            <Text style={styles.currencyPrefix}>BDT</Text>
            <TextInput
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#9AA7A1"
              style={styles.amountInput}
            />
          </View>
          <View style={styles.quickAmountRow}>
            {quickAmounts.map((quickAmount) => (
              <Pressable
                key={quickAmount}
                style={[
                  styles.quickAmountChip,
                  amount === quickAmount && styles.quickAmountChipActive,
                ]}
                onPress={() => setAmount(quickAmount)}
                accessibilityRole="button">
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === quickAmount && styles.quickAmountTextActive,
                  ]}>
                  {formatCurrency(Number(quickAmount)).replace('.00', '')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow label={t('billPayPage.biller')} value={selectedBiller.shortName} />
          <SummaryRow label={t('billPayPage.billingId')} value={billingId || t('generic.required')} />
          {needsBillDate ? (
            <SummaryRow label={t('billPayPage.billDate')} value={billDate || t('generic.required')} />
          ) : null}
          {needsBillType ? (
            <SummaryRow label={t('billPayPage.billType')} value={t(`billPayPage.billTypes.${billType}`)} />
          ) : null}
          <SummaryRow label={t('generic.amount')} value={formatCurrency(numericAmount)} />
          <View style={styles.summaryDivider} />
          <SummaryRow label={t('generic.remainingBalance')} value={formatCurrency(remainingBalance)} strong />
        </View>

        <Pressable
          style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
          disabled={!canContinue}
          onPress={handleContinue}
          accessibilityRole="button">
          <MaterialIcons name="lock" size={18} color={palette.surface} />
          <Text style={styles.primaryButtonText}>{t('generic.continueSecurely')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>{value}</Text>
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
  secureBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softAmber,
  },
  heroCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.amber,
    borderRadius: 8,
    padding: 15,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
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
    color: '#FFF7DE',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  categoryTabs: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 10,
  },
  categoryTab: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  categoryTabActive: {
    borderColor: palette.amber,
    backgroundColor: palette.amber,
  },
  categoryTabText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  categoryTabTextActive: {
    color: palette.surface,
  },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  panelTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  billerScroll: {
    maxHeight: 320,
  },
  billerList: {
    gap: 9,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
    padding: 12,
  },
  billerRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
    padding: 10,
  },
  billerRowActive: {
    borderColor: palette.amber,
    backgroundColor: palette.softAmber,
  },
  billerIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billerCopy: {
    flex: 1,
  },
  billerName: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  billerMeta: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  billTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  billTypeButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
  },
  billTypeButtonActive: {
    borderColor: palette.amber,
    backgroundColor: palette.amber,
  },
  billTypeText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  billTypeTextActive: {
    color: palette.surface,
  },
  amountPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  amountBox: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.softAmber,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    color: palette.amber,
    fontSize: 14,
    fontWeight: '900',
  },
  amountInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 34,
    fontWeight: '900',
  },
  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountChip: {
    minHeight: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
  },
  quickAmountChipActive: {
    backgroundColor: palette.amber,
    borderColor: palette.amber,
  },
  quickAmountText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  quickAmountTextActive: {
    color: palette.surface,
  },
  summaryCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryValue: {
    flex: 1,
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  summaryValueStrong: {
    color: palette.amber,
    fontSize: 14,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.amber,
    borderRadius: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
});

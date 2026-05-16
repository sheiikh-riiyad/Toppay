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

import WalletMiniLogo from '@/components/WalletMiniLogo';
import { useAuth } from '@/contexts/auth';
import { useBonusRate } from '@/hooks/use-bonus-rate';
import { useDeviceContacts } from '@/hooks/use-device-contacts';
import { useWalletData } from '@/hooks/use-wallet-data';
import { cashOutMethods, formatCurrency, palette, type CashOutMethod, type Contact } from '@/constants/toppay';
import { calculateBonus } from '@/services/bonus';

const quickAmounts = ['500', '1000', '2500', '5000'];

// Send money methods (using selected mobile wallet methods)
const sendMoneyMethods = cashOutMethods.filter(m => ['bKash', 'Nagad', 'Rocket'].includes(m.name));

export default function SendMoneyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { bonusRate } = useBonusRate('sendmoney');
  const { summary } = useWalletData(account?.uid);
  const {
    contacts: deviceContacts,
    hasPermission: hasContactsPermission,
    isLoading: isLoadingContacts,
    loadContacts,
    permissionStatus,
  } = useDeviceContacts();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [phone, setPhone] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<CashOutMethod>(sendMoneyMethods[0]);
  const [amount, setAmount] = useState('2500');
  const [note, setNote] = useState('Dinner and ride share');

  const balance = summary?.balance ?? 0;
  const numericAmount = Number(amount) || 0;
  const bonusAmount = calculateBonus(numericAmount, bonusRate.percentis);
  const remainingBalance = Math.max(balance - numericAmount, 0);
  const canContinue = numericAmount > 0 && phone.trim().length >= 8;
  const recipientName = selectedContact?.name || phone || t('generic.recipient');
  const contactsMessageKey = permissionStatus === 'unavailable'
    ? 'sendMoneyPage.contactsUnavailable'
    : hasContactsPermission
      ? 'sendMoneyPage.noDeviceContacts'
      : 'sendMoneyPage.contactsPermission';
  const canRequestContacts = permissionStatus !== 'denied' && permissionStatus !== 'unavailable';

  const recipientLine = useMemo(
    () => t('sendMoneyPage.recipientReceives', {
      name: recipientName,
      amount: formatCurrency(numericAmount),
    }),
    [numericAmount, recipientName, t]
  );

  function chooseContact(contact: Contact) {
    setSelectedContact(contact);
    setPhone(contact.phone);
  }

  function handlePhoneChange(nextPhone: string) {
    setSelectedContact(null);
    setPhone(nextPhone);
  }

  function handleContinue() {
    router.push({
      pathname: '/send-money-confirmation',
      params: {
        receiverName: selectedContact?.name || phone,
        receiverPhone: phone,
        method: selectedMethod.name,
        amount,
        bonus: bonusAmount.toString(),
        bonusPercentis: bonusRate.percentis.toString(),
        note: note || t('sendMoneyPage.personalTransfer'),
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
            <Text style={styles.kicker}>{t('sendMoneyPage.kicker')}</Text>
            <Text style={styles.title}>{t('sendMoneyPage.title')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="shield" size={17} color={palette.primary} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="send" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('sendMoneyPage.fastTransfer')}</Text>
            <Text style={styles.heroMeta}>{t('sendMoneyPage.balanceLine', { amount: formatCurrency(balance) })}</Text>
          </View>
          <Text style={styles.heroTag}>{t('sendMoneyPage.bonusTag', { rate: bonusRate.label })}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('generic.paymentMethod')}</Text>
          <View style={styles.methodGrid}>
            {sendMoneyMethods.map((method) => {
              const active = method.name === selectedMethod.name;
              return (
                <Pressable
                  key={method.name}
                  style={[styles.methodCard, active && styles.methodCardActive]}
                  onPress={() => setSelectedMethod(method)}
                  accessibilityRole="button">
                  <WalletMiniLogo color={method.color} mark={method.mark} name={method.name} size={40} />
                  <Text style={styles.methodName}>{method.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('generic.recipient')}</Text>
          <View style={styles.inputRow}>
            <MaterialIcons name="contact-phone" size={21} color={palette.muted} />
            <TextInput
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder={t('sendMoneyPage.phonePlaceholder')}
              placeholderTextColor={palette.muted}
              style={styles.input}
            />
          </View>
          {isLoadingContacts ? (
            <View style={styles.contactState}>
              <MaterialIcons name="sync" size={20} color={palette.primary} />
              <Text style={styles.contactStateText}>{t('sendMoneyPage.loadingContacts')}</Text>
            </View>
          ) : deviceContacts.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.contactRail}>
              {deviceContacts.map((contact) => {
                const active = contact.phone === phone;

                return (
                  <Pressable
                    key={`${contact.phone}-${contact.name}`}
                    style={[styles.contactCard, active && styles.contactCardActive]}
                    onPress={() => chooseContact(contact)}
                    accessibilityRole="button">
                    <View style={[styles.avatar, { backgroundColor: contact.color }]}>
                      <Text style={styles.avatarText}>{contact.initials}</Text>
                    </View>
                    <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.contactState}>
              <MaterialIcons name="contacts" size={20} color={palette.primary} />
              <Text style={styles.contactStateText}>{t(contactsMessageKey)}</Text>
              {canRequestContacts ? (
                <Pressable style={styles.contactStateButton} onPress={loadContacts} accessibilityRole="button">
                  <Text style={styles.contactStateButtonText}>{t('sendMoneyPage.loadContacts')}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
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
          <View style={styles.inputRow}>
            <MaterialIcons name="notes" size={21} color={palette.muted} />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('sendMoneyPage.addNotePlaceholder')}
              placeholderTextColor={palette.muted}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SummaryRow label={t('generic.recipient')} value={recipientName} />
          <SummaryRow label={t('sendMoneyPage.transferAmount')} value={formatCurrency(numericAmount)} />
          <SummaryRow label={t('generic.charge')} value="BDT 0.00" />
          <SummaryRow label={`${t('generic.bonus')} (${bonusRate.label})`} value={formatCurrency(bonusAmount)} />
          <View style={styles.summaryDivider} />
          <SummaryRow label={t('generic.remainingBalance')} value={formatCurrency(remainingBalance)} strong />
        </View>

        <View style={styles.memoryCard}>
          <View style={styles.memoryIcon}>
            <MaterialIcons name="favorite" size={20} color={palette.coral} />
          </View>
          <View style={styles.memoryCopy}>
            <Text style={styles.memoryTitle}>{recipientLine}</Text>
            <Text style={styles.memoryMeta}>{note || t('sendMoneyPage.personalTransfer')}</Text>
          </View>
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
  heroTag: {
    color: palette.primaryDark,
    backgroundColor: '#DDF5EC',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900',
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
  contactRail: {
    gap: 10,
    paddingRight: 14,
  },
  contactState: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  contactStateText: {
    flex: 1,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  contactStateButton: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  contactStateButtonText: {
    color: palette.surface,
    fontSize: 12,
    fontWeight: '900',
  },
  contactCard: {
    width: 116,
    minHeight: 118,
    alignItems: 'center',
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 11,
  },
  contactCardActive: {
    borderColor: palette.primary,
    backgroundColor: palette.softGreen,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  avatarText: {
    color: palette.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  contactName: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  contactPhone: {
    color: palette.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
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
    backgroundColor: palette.softGreen,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    color: palette.primary,
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
    backgroundColor: palette.primary,
    borderColor: palette.primary,
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
    gap: 11,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    flex: 1,
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  summaryValueStrong: {
    color: palette.primary,
    fontSize: 15,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  memoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.softCoral,
    borderRadius: 8,
    padding: 14,
  },
  memoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  memoryCopy: {
    flex: 1,
  },
  memoryTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  memoryMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  methodGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  methodCard: {
    flex: 1,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  methodCardActive: {
    borderColor: palette.primary,
    borderWidth: 2,
    backgroundColor: palette.surfaceAlt,
  },
  methodName: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  primaryButton: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#A8B7B0',
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
});

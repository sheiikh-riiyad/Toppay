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
import { useDeviceContacts } from '@/hooks/use-device-contacts';
import { useWalletData } from '@/hooks/use-wallet-data';
import {
  formatCurrency,
  mobileRechargeProviders,
  palette,
  type Contact,
  type MobileRechargeProvider,
} from '@/constants/toppay';

const quickAmounts = ['50', '100', '200', '500', '1000'];

export default function MobileRechargeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
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
  const [selectedProvider, setSelectedProvider] = useState<MobileRechargeProvider>(mobileRechargeProviders[0]);
  const [amount, setAmount] = useState('100');

  const balance = summary?.balance ?? 0;
  const numericAmount = Number(amount) || 0;
  const remainingBalance = Math.max(balance - numericAmount, 0);
  const recipientName = selectedContact?.name || phone || t('generic.recipient');
  const canContinue = numericAmount > 0 && phone.trim().length >= 8;
  const contactsMessageKey = permissionStatus === 'unavailable'
    ? 'sendMoneyPage.contactsUnavailable'
    : hasContactsPermission
      ? 'sendMoneyPage.noDeviceContacts'
      : 'sendMoneyPage.contactsPermission';
  const canRequestContacts = permissionStatus !== 'denied' && permissionStatus !== 'unavailable';

  const rechargeLine = useMemo(
    () => t('mobileRechargePage.rechargeLine', {
      provider: selectedProvider.name,
      amount: formatCurrency(numericAmount),
    }),
    [numericAmount, selectedProvider.name, t]
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
      pathname: '/mobile-recharge-confirmation',
      params: {
        receiverName: selectedContact?.name || phone,
        receiverPhone: phone.trim(),
        provider: selectedProvider.name,
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
            <Text style={styles.kicker}>{t('mobileRechargePage.kicker')}</Text>
            <Text style={styles.title}>{t('mobileRechargePage.title')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="phone-android" size={20} color={palette.cyan} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="bolt" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('mobileRechargePage.heroTitle')}</Text>
            <Text style={styles.heroMeta}>{t('mobileRechargePage.balanceLine', { amount: formatCurrency(balance) })}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('mobileRechargePage.mobileNumber')}</Text>
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
              <MaterialIcons name="sync" size={20} color={palette.cyan} />
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
              <MaterialIcons name="contacts" size={20} color={palette.cyan} />
              <Text style={styles.contactStateText}>{t(contactsMessageKey)}</Text>
              {canRequestContacts ? (
                <Pressable style={styles.contactStateButton} onPress={loadContacts} accessibilityRole="button">
                  <Text style={styles.contactStateButtonText}>{t('sendMoneyPage.loadContacts')}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('mobileRechargePage.provider')}</Text>
          <View style={styles.providerGrid}>
            {mobileRechargeProviders.map((provider) => {
              const active = provider.name === selectedProvider.name;

              return (
                <Pressable
                  key={provider.name}
                  style={[styles.providerCard, active && styles.providerCardActive]}
                  onPress={() => setSelectedProvider(provider)}
                  accessibilityRole="button">
                  <View style={[styles.providerMark, { backgroundColor: provider.color }]}>
                    <Text style={styles.providerMarkText}>{provider.mark}</Text>
                  </View>
                  <Text style={styles.providerName}>{provider.name}</Text>
                </Pressable>
              );
            })}
          </View>
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
          <SummaryRow label={t('generic.recipient')} value={recipientName} />
          <SummaryRow label={t('mobileRechargePage.provider')} value={selectedProvider.name} />
          <SummaryRow label={t('generic.amount')} value={formatCurrency(numericAmount)} />
          <View style={styles.summaryDivider} />
          <SummaryRow label={t('generic.remainingBalance')} value={formatCurrency(remainingBalance)} strong />
        </View>

        <View style={styles.memoryCard}>
          <View style={styles.memoryIcon}>
            <MaterialIcons name="phone-android" size={20} color={palette.cyan} />
          </View>
          <View style={styles.memoryCopy}>
            <Text style={styles.memoryTitle}>{rechargeLine}</Text>
            <Text style={styles.memoryMeta}>{recipientName}</Text>
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
    color: palette.cyan,
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
    backgroundColor: palette.softCyan,
  },
  heroCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.cyan,
    borderRadius: 8,
    padding: 15,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    color: '#DDF7FB',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
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
    paddingRight: 4,
  },
  contactCard: {
    width: 118,
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 10,
  },
  contactCardActive: {
    borderColor: palette.cyan,
    backgroundColor: palette.softCyan,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  contactName: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  contactPhone: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  contactState: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: palette.background,
    borderRadius: 8,
    padding: 12,
  },
  contactStateText: {
    flex: 1,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  contactStateButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.softCyan,
    paddingHorizontal: 10,
  },
  contactStateButtonText: {
    color: palette.cyan,
    fontSize: 11,
    fontWeight: '900',
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  providerCard: {
    width: '30.8%',
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 8,
  },
  providerCardActive: {
    borderColor: palette.cyan,
    backgroundColor: palette.softCyan,
  },
  providerMark: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerMarkText: {
    color: palette.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  providerName: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
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
    backgroundColor: palette.softCyan,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    color: palette.cyan,
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
    backgroundColor: palette.cyan,
    borderColor: palette.cyan,
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
    color: palette.cyan,
    fontSize: 14,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  memoryCard: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.softCyan,
    borderRadius: 8,
    padding: 13,
  },
  memoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 157, 178, 0.12)',
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
    fontWeight: '700',
    marginTop: 3,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.cyan,
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

import TransactionStep from '@/components/TransactionStep';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

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
  const { provider } = useLocalSearchParams<{ provider?: string }>();
  const [step, setStep] = useState(0);
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
  const [selectedMethod, setSelectedMethod] = useState<CashOutMethod>(() => sendMoneyMethods.find(method => provider === 'Bank' ? method.type === 'Bank account' : method.name === provider) ?? sendMoneyMethods[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const balance = summary?.balance ?? 0;
  const numericAmount = Number(amount) || 0;
  const bonusAmount = calculateBonus(numericAmount, bonusRate.percentis);
  const canContinue = numericAmount > 0 && phone.trim().length >= 8;
  const contactsMessageKey = permissionStatus === 'unavailable'
    ? 'sendMoneyPage.contactsUnavailable'
    : hasContactsPermission
      ? 'sendMoneyPage.noDeviceContacts'
      : 'sendMoneyPage.contactsPermission';
  const canRequestContacts = permissionStatus !== 'denied' && permissionStatus !== 'unavailable';


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

  const stepValid = step === 1 ? phone.trim().length >= 8 : step === 2 ? canContinue && Number.isFinite(numericAmount) : true;
  return (
    <TransactionStep title={t('sendMoneyPage.title')} step={step + 1} total={5}
      onBack={() => step > 0 ? setStep(step - 1) : router.back()}
      onNext={() => step < 2 ? setStep(step + 1) : handleContinue()} disabled={!stepValid}>
      {step === 0 ? (<>        <View style={styles.panel}>
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

</>) : null}
      {step === 1 ? (<>        <View style={styles.panel}>
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

</>) : null}
      {step === 2 ? (<>
        <Text style={styles.stepBalance}>{t('home.availableBalance')}: {formatCurrency(balance)}</Text>
                <View style={styles.amountPanel}>
          <Text style={styles.panelTitle}>{t('generic.amount')}</Text>
          <View style={styles.amountBox}>
            <Text style={styles.currencyPrefix}>BDT</Text>
            <TextInput
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#96838C"
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
              maxLength={80}
              value={note}
              onChangeText={setNote}
              placeholder={t('sendMoneyPage.addNotePlaceholder')}
              placeholderTextColor={palette.muted}
              style={styles.input}
            />
          </View>
        </View>


      </>) : null}
    </TransactionStep>
  );
}

const styles = StyleSheet.create({
  stepBalance: { color: palette.muted, fontSize: 13 },
  panel: {
    gap: 14,
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
    backgroundColor: palette.softPrimary,
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
    gap: 16,
  },
  amountBox: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.softPrimary,
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
});

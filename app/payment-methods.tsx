import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, type WalletIconName } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';
import { useSavedPaymentMethods } from '@/hooks/use-saved-payment-methods';
import {
  deleteSavedPaymentMethod,
  saveBankPaymentMethod,
  saveCardPaymentMethod,
  type SavedBankPaymentMethod,
  type SavedCardPaymentMethod,
} from '@/services/saved-payment-methods';

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { bankAccounts, cards, isLoading } = useSavedPaymentMethods(account?.uid);
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [formError, setFormError] = useState('');

  const canSaveBank = Boolean(account && bankName.trim() && accountHolderName.trim() && accountNumber.trim()) && !isSavingBank;
  const cardDigits = cardNumber.replace(/\D/g, '');
  const expiryMonthNumber = Number(expiryMonth);
  const canSaveCard = Boolean(
    account
      && cardholderName.trim()
      && cardDigits.length >= 12
      && expiryMonthNumber >= 1
      && expiryMonthNumber <= 12
      && expiryYear.trim().length >= 2
  )
    && !isSavingCard;

  async function handleSaveBank() {
    if (!account || !canSaveBank) {
      return;
    }

    setIsSavingBank(true);
    setFormError('');

    try {
      await saveBankPaymentMethod(account.uid, {
        accountHolderName,
        accountNumber,
        bankName,
        branchName,
      });
      setBankName('');
      setAccountHolderName('');
      setAccountNumber('');
      setBranchName('');
      Alert.alert(t('common.success'), t('paymentMethods.bankSaved'));
    } catch {
      setFormError(t('paymentMethods.saveFailed'));
    } finally {
      setIsSavingBank(false);
    }
  }

  async function handleSaveCard() {
    if (!account || !canSaveCard) {
      return;
    }

    setIsSavingCard(true);
    setFormError('');

    try {
      await saveCardPaymentMethod(account.uid, {
        cardNumber,
        cardholderName,
        expiryMonth,
        expiryYear,
      });
      setCardholderName('');
      setCardNumber('');
      setExpiryMonth('');
      setExpiryYear('');
      Alert.alert(t('common.success'), t('paymentMethods.cardSaved'));
    } catch {
      setFormError(t('paymentMethods.saveFailed'));
    } finally {
      setIsSavingCard(false);
    }
  }

  function handleDelete(methodId: string) {
    if (!account) {
      return;
    }

    Alert.alert(t('common.delete'), t('paymentMethods.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSavedPaymentMethod(account.uid, methodId);
          } catch {
            setFormError(t('paymentMethods.deleteFailed'));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('paymentMethods.kicker')}</Text>
            <Text style={styles.title}>{t('paymentMethods.title')}</Text>
          </View>
        </View>

        <View style={styles.heroPanel}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="credit-card" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('paymentMethods.heroTitle')}</Text>
            <Text style={styles.heroMeta}>{t('paymentMethods.heroMeta')}</Text>
          </View>
        </View>

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('paymentMethods.addBankTitle')}</Text>
          <Field
            icon="account-balance"
            onChangeText={setBankName}
            placeholder={t('paymentMethods.bankName')}
            value={bankName}
          />
          <Field
            icon="person"
            onChangeText={setAccountHolderName}
            placeholder={t('paymentMethods.accountHolderName')}
            value={accountHolderName}
          />
          <Field
            icon="tag"
            keyboardType="number-pad"
            onChangeText={setAccountNumber}
            placeholder={t('paymentMethods.accountNumber')}
            value={accountNumber}
          />
          <Field
            icon="store"
            onChangeText={setBranchName}
            placeholder={t('paymentMethods.branchNameOptional')}
            value={branchName}
          />
          <Pressable
            style={[styles.primaryButton, !canSaveBank && styles.disabledButton]}
            disabled={!canSaveBank}
            onPress={handleSaveBank}
            accessibilityRole="button">
            <MaterialIcons name="account-balance" size={18} color={palette.surface} />
            <Text style={styles.primaryButtonText}>
              {isSavingBank ? t('common.loading') : t('paymentMethods.saveBank')}
            </Text>
          </Pressable>
        </View>

        <SavedSection
          emptyText={isLoading ? t('common.loading') : t('paymentMethods.noBankAccounts')}
          icon="account-balance"
          items={bankAccounts}
          title={t('paymentMethods.bankAccounts')}
          onDelete={handleDelete}
        />

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('paymentMethods.addCardTitle')}</Text>
          <Field
            icon="person"
            onChangeText={setCardholderName}
            placeholder={t('paymentMethods.cardholderName')}
            value={cardholderName}
          />
          <Field
            icon="credit-card"
            keyboardType="number-pad"
            maxLength={23}
            onChangeText={(value) => setCardNumber(formatCardNumber(value))}
            placeholder={t('paymentMethods.cardNumber')}
            value={cardNumber}
          />
          <View style={styles.expiryRow}>
            <Field
              compact
              icon="calendar-month"
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(value) => setExpiryMonth(value.replace(/\D/g, '').slice(0, 2))}
              placeholder={t('paymentMethods.expiryMonth')}
              value={expiryMonth}
            />
            <Field
              compact
              icon="event"
              keyboardType="number-pad"
              maxLength={4}
              onChangeText={(value) => setExpiryYear(value.replace(/\D/g, '').slice(0, 4))}
              placeholder={t('paymentMethods.expiryYear')}
              value={expiryYear}
            />
          </View>
          <View style={styles.securityNote}>
            <MaterialIcons name="lock" size={18} color={palette.primary} />
            <Text style={styles.securityNoteText}>{t('paymentMethods.cardSecurityNote')}</Text>
          </View>
          <Pressable
            style={[styles.primaryButton, !canSaveCard && styles.disabledButton]}
            disabled={!canSaveCard}
            onPress={handleSaveCard}
            accessibilityRole="button">
            <MaterialIcons name="credit-card" size={18} color={palette.surface} />
            <Text style={styles.primaryButtonText}>
              {isSavingCard ? t('common.loading') : t('paymentMethods.saveCard')}
            </Text>
          </Pressable>
        </View>

        <SavedSection
          emptyText={isLoading ? t('common.loading') : t('paymentMethods.noCards')}
          icon="credit-card"
          items={cards}
          title={t('paymentMethods.cards')}
          onDelete={handleDelete}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  compact,
  icon,
  keyboardType,
  maxLength,
  onChangeText,
  placeholder,
  value,
}: {
  compact?: boolean;
  icon: WalletIconName;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={[styles.inputRow, compact && styles.inputRowCompact]}>
      <MaterialIcons name={icon} size={20} color={palette.muted} />
      <TextInput
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function SavedSection({
  emptyText,
  icon,
  items,
  onDelete,
  title,
}: {
  emptyText: string;
  icon: WalletIconName;
  items: (SavedBankPaymentMethod | SavedCardPaymentMethod)[];
  onDelete: (methodId: string) => void;
  title: string;
}) {
  return (
    <View style={styles.savedSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{items.length}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.savedRow}>
            <View style={styles.savedIcon}>
              <MaterialIcons name={icon} size={22} color={palette.primary} />
            </View>
            <View style={styles.savedCopy}>
              <Text style={styles.savedTitle}>{item.label}</Text>
              <Text style={styles.savedMeta}>
                {item.kind === 'card'
                  ? `${item.cardholderName} | ${item.expiryMonth}/${item.expiryYear}`
                  : `${item.accountHolderName}${item.branchName ? ` | ${item.branchName}` : ''}`}
              </Text>
            </View>
            <Pressable
              style={styles.deleteButton}
              onPress={() => onDelete(item.id)}
              accessibilityRole="button">
              <MaterialIcons name="delete-outline" size={20} color={palette.danger} />
            </Pressable>
          </View>
        ))
      )}
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
    paddingBottom: 34,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
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
  heroPanel: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 8,
    backgroundColor: palette.primary,
    padding: 15,
  },
  heroIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
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
    lineHeight: 17,
    marginTop: 5,
  },
  panel: {
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 14,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
    paddingHorizontal: 13,
  },
  inputRowCompact: {
    flex: 1,
  },
  input: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  expiryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  securityNote: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: palette.softGreen,
    padding: 12,
  },
  securityNoteText: {
    flex: 1,
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  primaryButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: palette.primary,
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 14,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.52,
  },
  savedSection: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionCount: {
    minWidth: 28,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: palette.surface,
    color: palette.primary,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: 'center',
  },
  emptyText: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    padding: 14,
  },
  savedRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 12,
  },
  savedIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.softGreen,
  },
  savedCopy: {
    flex: 1,
  },
  savedTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  savedMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
  },
  deleteButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.softCoral,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
});

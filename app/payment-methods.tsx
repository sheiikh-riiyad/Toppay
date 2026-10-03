import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Alert, BackHandler, Keyboard, KeyboardAvoidingView, Platform,
    Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';
import { useSavedPaymentMethods } from '@/hooks/use-saved-payment-methods';
import {
    deleteSavedPaymentMethod, saveBankPaymentMethod, saveCardPaymentMethod,
    type SavedPaymentMethodKind
} from '@/services/saved-payment-methods';

function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { bankAccounts, cards, isLoading, error } = useSavedPaymentMethods(account?.uid);
  const [activeType, setActiveType] = useState<SavedPaymentMethodKind>('card');
  const [showForm, setShowForm] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const saveLock = useRef(false);
  const isCard = activeType === 'card';
  const items = isCard ? cards : bankAccounts;
  const addLabel = t(isCard ? 'paymentMethods.addCardTitle' : 'paymentMethods.addBankTitle');
  const saveLabel = t(isCard ? 'paymentMethods.saveCard' : 'paymentMethods.saveBank');
  const canSaveBank = Boolean(bankName.trim() && accountHolderName.trim() && accountNumber.trim());
  const cardDigits = cardNumber.replace(/\D/g, '');
  const expiryMonthNumber = Number(expiryMonth);
  const canSaveCard = Boolean(
    cardholderName.trim()
      && phoneNumber.replace(/\D/g, '').length >= 7
      && phoneNumber.replace(/\D/g, '').length <= 15
      && zipCode.trim()
      && cardDigits.length >= 12 && cardDigits.length <= 19
      && expiryMonthNumber >= 1 && expiryMonthNumber <= 12
      && /^\d{2}(\d{2})?$/.test(expiryYear)
  );
  const canSave = Boolean(account) && (isCard ? canSaveCard : canSaveBank) && !isSaving;

  const resetForm = useCallback(() => {
    setBankName('');
    setAccountHolderName('');
    setAccountNumber('');
    setBranchName('');
    setCardholderName('');
    setPhoneNumber('');
    setCardNumber('');
    setZipCode('');
    setExpiryMonth('');
    setExpiryYear('');
    setFormError('');
  }, []);

  const handleBack = useCallback(() => {
    if (saveLock.current) return;
    Keyboard.dismiss();
    if (showForm) {
      setShowForm(false);
      resetForm();
    } else {
      router.back();
    }
  }, [resetForm, router, showForm]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack]));

  function openForm() {
    resetForm();
    setSuccessMessage('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!account || !canSave || saveLock.current) return;
    saveLock.current = true;
    Keyboard.dismiss();
    setIsSaving(true);
    setFormError('');
    try {
      if (isCard) {
        await saveCardPaymentMethod(account.uid, { cardNumber, cardholderName, phoneNumber, expiryMonth, expiryYear, zipCode });
      } else {
        await saveBankPaymentMethod(account.uid, { accountHolderName, accountNumber, bankName, branchName });
      }
      resetForm();
      setShowForm(false);
      setSuccessMessage(t(isCard ? 'paymentMethods.cardSaved' : 'paymentMethods.bankSaved'));
    } catch {
      setFormError(t('paymentMethods.saveFailed'));
    } finally {
      saveLock.current = false;
      setIsSaving(false);
    }
  }

  function handleDelete(methodId: string) {
    if (!account || deletingId) return;
    Alert.alert(t('common.delete'), t('paymentMethods.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeletingId(methodId);
          setFormError('');
          setSuccessMessage('');
          try {
            await deleteSavedPaymentMethod(account.uid, methodId);
          } catch {
            setFormError(t('paymentMethods.deleteFailed'));
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack} disabled={isSaving} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <MaterialIcons name="arrow-back" size={24} color={palette.primary} />
          </Pressable>
          <Text style={styles.title}>{showForm ? addLabel : t('paymentMethods.title')}</Text>
        </View>

        {!showForm && (
          <View style={styles.tabs}>
            {(['card', 'bank'] as const).map((kind) => {
              const active = activeType === kind;
              return (
                <Pressable
                  key={kind}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => { setActiveType(kind); setFormError(''); setSuccessMessage(''); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}>
                  <MaterialIcons name={kind === 'card' ? 'credit-card' : 'account-balance'} size={20} color={active ? palette.primary : palette.muted} />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t(kind === 'card' ? 'paymentMethods.cards' : 'paymentMethods.banks')}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <ScrollView
          key={activeType + String(showForm)}
          style={styles.body}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {formError ? <Text style={styles.errorText} accessibilityRole="alert">{formError}</Text> : null}
          {successMessage ? <Text style={styles.successText} accessibilityRole="alert">{successMessage}</Text> : null}

          {showForm ? (
            <View style={styles.form}>
              {isCard ? (
                <>
                  <Field label={t('paymentMethods.cardholderName')} value={cardholderName} onChangeText={setCardholderName} autoCapitalize="words" editable={!isSaving} />
                  <Field label={t('paymentMethods.phoneNumber')} value={phoneNumber} onChangeText={(value) => setPhoneNumber(value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '').slice(0, 16))} keyboardType="phone-pad" maxLength={16} autoComplete="tel" editable={!isSaving} />
                  <Field label={t('paymentMethods.cardNumber')} value={cardNumber} onChangeText={(value) => setCardNumber(formatCardNumber(value))} keyboardType="number-pad" maxLength={23} editable={!isSaving} />
                  <Field label={t('paymentMethods.zipCode')} value={zipCode} onChangeText={(value) => setZipCode(value.replace(/\s+/g, '').slice(0, 20))} autoCapitalize="characters" editable={!isSaving} />
                  <Text style={styles.fieldLabel}>{t('paymentMethods.expiryDate')}</Text>
                  <View style={styles.expiryRow}>
                    <Field compact label={t('paymentMethods.expiryMonth')} value={expiryMonth} onChangeText={(value) => setExpiryMonth(value.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" maxLength={2} editable={!isSaving} />
                    <Field compact label={t('paymentMethods.expiryYear')} value={expiryYear} onChangeText={(value) => setExpiryYear(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} editable={!isSaving} />
                  </View>
                  {/* <View style={styles.securityNote}>
                    <MaterialIcons name="lock-outline" size={18} color={palette.muted} />
                    <Text style={styles.hint}>{t('paymentMethods.cardSecurityNote')}</Text>
                  </View> */}
                </>
              ) : (
                <>
                  <Field label={t('paymentMethods.bankName')} value={bankName} onChangeText={setBankName} autoCapitalize="words" editable={!isSaving} />
                  <Field label={t('paymentMethods.accountHolderName')} value={accountHolderName} onChangeText={setAccountHolderName} autoCapitalize="words" editable={!isSaving} />
                  <Field label={t('paymentMethods.accountNumber')} value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" editable={!isSaving} />
                  <Field label={t('paymentMethods.branchNameOptional')} value={branchName} onChangeText={setBranchName} autoCapitalize="words" editable={!isSaving} />
                </>
              )}
            </View>
          ) : isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={palette.primary} />
              <Text style={styles.emptyMeta}>{t('common.loading')}</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText} accessibilityRole="alert">{t('paymentMethods.loadFailed')}</Text>
          ) : items.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name={isCard ? 'credit-card' : 'account-balance'} size={34} color={palette.primary} />
              </View>
              <Text style={styles.emptyTitle}>{t(isCard ? 'paymentMethods.noCards' : 'paymentMethods.noBankAccounts')}</Text>
              <Text style={styles.emptyMeta}>{t('paymentMethods.addToStart')}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.listLabel}>{t('paymentMethods.savedCount', { count: items.length })}</Text>
              {items.map((item) => (
                <View key={item.id} style={styles.savedRow}>
                  <View style={styles.savedIcon}>
                    <MaterialIcons name={item.kind === 'card' ? 'credit-card' : 'account-balance'} size={23} color={palette.primary} />
                  </View>
                  <View style={styles.savedCopy}>
                    <Text style={styles.savedTitle}>{item.kind === 'card' ? item.label : item.bankName}</Text>
                    <Text style={styles.savedMeta}>{item.kind === 'card' ? item.cardholderName : item.accountHolderName}</Text>
                    <Text style={styles.savedMeta}>{item.kind === 'card' ? item.expiryMonth + '/' + item.expiryYear : item.accountNumber}</Text>
                  </View>
                  <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id)} disabled={Boolean(deletingId)} accessibilityRole="button" accessibilityLabel={t('paymentMethods.removeMethod', { name: item.label })}>
                    {deletingId === item.id ? <ActivityIndicator size="small" color={palette.danger} /> : <MaterialIcons name="delete-outline" size={21} color={palette.muted} />}
                  </Pressable>
                </View>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryButton, showForm && !canSave && styles.disabledButton]}
            disabled={showForm && !canSave}
            onPress={showForm ? handleSave : openForm}
            accessibilityRole="button"
            accessibilityState={{ disabled: showForm && !canSave, busy: isSaving }}>
            {isSaving ? <ActivityIndicator color={palette.surface} /> : <MaterialIcons name={showForm ? 'check' : 'add'} size={22} color={palette.surface} />}
            <Text style={styles.primaryButtonText}>{isSaving ? t('common.loading') : showForm ? saveLabel : addLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ compact, label, ...props }: TextInputProps & { compact?: boolean; label: string }) {
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      {!compact && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput {...props} accessibilityLabel={label} placeholder={compact ? label : undefined} placeholderTextColor={palette.muted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: palette.ink, fontSize: 21, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginBottom: 4, padding: 4, borderRadius: 12, backgroundColor: palette.background },
  tab: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8 },
  tabActive: { backgroundColor: palette.softPrimary },
  tabText: { color: palette.muted, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: palette.primary },
  body: { flex: 1 },
  content: { flexGrow: 1, padding: 20, gap: 12 },
  form: { gap: 18 },
  field: { gap: 8 },
  compactField: { flex: 1 },
  fieldLabel: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingHorizontal: 13, color: palette.ink, backgroundColor: palette.background, fontSize: 16 },
  expiryRow: { flexDirection: 'row', gap: 12, marginTop: -10 },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  hint: { flex: 1, color: palette.muted, fontSize: 12, lineHeight: 18 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 12 },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.softPrimary },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptyMeta: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  listLabel: { color: palette.muted, fontSize: 13, marginBottom: 2 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: palette.border },
  savedIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.softPrimary },
  savedCopy: { flex: 1 },
  savedTitle: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  savedMeta: { color: palette.muted, fontSize: 12, marginTop: 4 },
  setPinButton: { minHeight: 44, justifyContent: 'center' },
  setPinText: { color: palette.primary, fontSize: 13, fontWeight: '700' },
  deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: palette.border },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, backgroundColor: palette.primary },
  primaryButtonText: { color: palette.surface, fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.5 },
  errorText: { color: palette.danger, fontSize: 13, lineHeight: 19 },
  successText: { color: palette.primary, fontSize: 13, lineHeight: 19, backgroundColor: palette.softPrimary, padding: 12, borderRadius: 8 },
});

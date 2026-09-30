import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { type ComponentProps, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import TransactionStep from '@/components/TransactionStep';
import { formatCurrency, palette } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';
import { useWalletData } from '@/hooks/use-wallet-data';
import { createBankTransferRequest } from '@/services/wallet';

export default function BankTransferScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { summary, transactions, isLoading } = useWalletData(account?.uid);
  const [step, setStep] = useState(1);
  const [bankName, setBankName] = useState('');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [submittedId, setSubmittedId] = useState('');

  const numericAmount = Number(amount);
  const pendingDebit = transactions.filter(item => item.status === 'pending' && item.direction === 'out')
    .reduce((sum, item) => sum + item.totalDebit, 0);
  const available = Math.max(0, (summary?.balance ?? 0) - pendingDebit);
  const validRecipient = bankName.trim().length >= 2 && holderName.trim().length >= 2 &&
    /^\d{6,24}$/.test(accountNumber.replace(/\s/g, '')) &&
    (!routingNumber.trim() || /^\d{9}$/.test(routingNumber.trim()));
  const validAmount = /^\d+(\.\d{1,2})?$/.test(amount) && numericAmount > 0 && numericAmount <= available;

  async function submit() {
    if (submitting.current || !account?.uid || !validRecipient || !validAmount) return;
    submitting.current = true;
    setBusy(true);
    try {
      const request = await createBankTransferRequest({
        uid: account.uid,
        receiverBankName: bankName,
        receiverName: holderName,
        receiverAccount: accountNumber,
        receiverBranch: branch,
        receiverRoutingNumber: routingNumber,
        amount: numericAmount,
        note,
      });
      setSubmittedId(request.requestId);
      setStep(4);
    } catch {
      Alert.alert(t('common.error'), t('bankTransfer.submitFailed'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function back() {
    if (step === 4) { router.replace('/(tabs)'); return; }
    if (step > 1) { setStep(step - 1); return; }
    router.back();
  }

  return (
    <TransactionStep
      title={t('bankTransfer.title')}
      step={Math.min(step, 3)}
      total={3}
      onBack={back}
      onNext={() => step === 4 ? router.replace('/(tabs)') : step === 3 ? void submit() : setStep(step + 1)}
      nextLabel={step === 3 ? t('bankTransfer.submit') : step === 4 ? t('bankTransfer.home') : undefined}
      disabled={step === 1 ? !validRecipient : step === 2 ? isLoading || !validAmount : false}
      busy={busy}
    >
      {step === 1 ? <View style={styles.panel}>
        <Text style={styles.heading}>{t('bankTransfer.recipient')}</Text>
        <Field label={t('bankTransfer.bankName')} value={bankName} onChangeText={setBankName} maxLength={80} />
        <Field label={t('bankTransfer.holderName')} value={holderName} onChangeText={setHolderName} maxLength={80} />
        <Field label={t('bankTransfer.accountNumber')} value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" maxLength={30} />
        <Field label={t('bankTransfer.branchOptional')} value={branch} onChangeText={setBranch} maxLength={80} />
        <Field label={t('bankTransfer.routingOptional')} value={routingNumber} onChangeText={setRoutingNumber} keyboardType="number-pad" maxLength={9} />
        <Text style={styles.hint}>{t('bankTransfer.accountHint')}</Text>
      </View> : null}
      {step === 2 ? <View style={styles.panel}>
        <Text style={styles.heading}>{t('bankTransfer.amount')}</Text>
        <Text style={styles.balance}>{t('bankTransfer.available', { amount: formatCurrency(available) })}</Text>
        <Field label={t('bankTransfer.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" maxLength={12} />
        {amount && !validAmount ? <Text style={styles.error}>{t('bankTransfer.amountError')}</Text> : null}
        <Field label={t('bankTransfer.noteOptional')} value={note} onChangeText={setNote} maxLength={100} />
      </View> : null}
      {step === 3 ? <View style={styles.panel}>
        <Text style={styles.heading}>{t('bankTransfer.review')}</Text>
        <Line label={t('bankTransfer.bankName')} value={bankName.trim()} />
        <Line label={t('bankTransfer.holderName')} value={holderName.trim()} />
        <Line label={t('bankTransfer.accountNumber')} value={accountNumber.replace(/\s/g, '')} />
        {branch.trim() ? <Line label={t('bankTransfer.branchOptional')} value={branch.trim()} /> : null}
        {routingNumber.trim() ? <Line label={t('bankTransfer.routingOptional')} value={routingNumber.trim()} /> : null}
        <Line label={t('bankTransfer.amount')} value={formatCurrency(numericAmount)} />
        {note.trim() ? <Line label={t('bankTransfer.noteOptional')} value={note.trim()} /> : null}
        <Text style={styles.hint}>{t('bankTransfer.reviewHint')}</Text>
      </View> : null}
      {step === 4 ? <View style={styles.success}>
        <MaterialIcons name="check-circle" size={68} color={palette.primary} />
        <Text style={styles.heading}>{t('bankTransfer.submitted')}</Text>
        <Text style={styles.hint}>{t('bankTransfer.submittedHint')}</Text>
        <Text style={styles.requestId}>{t('bankTransfer.requestId', { id: submittedId })}</Text>
      </View> : null}
    </TransactionStep>
  );
}

function Field(props: ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} style={styles.input} placeholder={label} placeholderTextColor={palette.muted} /></View>;
}

function Line({ label, value }: { label: string; value: string }) {
  return <View style={styles.line}><Text style={styles.lineLabel}>{label}</Text><Text style={styles.lineValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  panel: { gap: 14 },
  heading: { fontSize: 21, fontWeight: '700', color: palette.ink },
  field: { gap: 6 },
  label: { fontSize: 13, color: palette.muted },
  input: { minHeight: 50, borderWidth: 1, borderColor: palette.border, borderRadius: 9, paddingHorizontal: 14, color: palette.ink, fontSize: 16 },
  hint: { color: palette.muted, lineHeight: 21, fontSize: 13 },
  balance: { fontSize: 16, fontWeight: '600', color: palette.primary },
  error: { color: '#B3263E', fontSize: 13 },
  line: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.border, gap: 4 },
  lineLabel: { color: palette.muted, fontSize: 12 },
  lineValue: { color: palette.ink, fontSize: 16, fontWeight: '600' },
  success: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 },
  requestId: { color: palette.ink, fontWeight: '700' },
});

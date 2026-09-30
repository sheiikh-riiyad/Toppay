import TransactionStep from '@/components/TransactionStep';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import WalletMiniLogo from '@/components/WalletMiniLogo';
import { useAuth } from '@/contexts/auth';
import { useBonusRate } from '@/hooks/use-bonus-rate';
import { useWalletData } from '@/hooks/use-wallet-data';
import { calculateBonus } from '@/services/bonus';
import {
    cashOutMethods,
    formatCurrency,
    palette,
    type CashOutMethod,
} from '@/constants/toppay';

const quickAmounts = ['1000', '2000', '5000', '10000'];
const chargeRate = 0.0185;

export default function CashOutScreen() {
  const router = useRouter();
  const { provider } = useLocalSearchParams<{ provider?: string }>();
  const [step, setStep] = useState(() => cashOutMethods.some(method => method.name === provider) ? 1 : 0);
  const { t } = useTranslation();
  const { account } = useAuth();
  const { bonusRate } = useBonusRate('cashout');
  const [selectedMethod, setSelectedMethod] = useState<CashOutMethod>(() => cashOutMethods.find(method => provider === 'Bank' ? method.type === 'Bank account' : method.name === provider) ?? cashOutMethods[0]);
  const providerLocked = cashOutMethods.some(method => method.name === provider);
  const { summary } = useWalletData(account?.uid);
  const [receiverAccount, setReceiverAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const balance = summary?.balance ?? 0;
  const numericAmount = Number(amount) || 0;
  const charge = numericAmount * chargeRate;
  const bonusAmount = calculateBonus(numericAmount, bonusRate.percentis);
  const totalDebit = numericAmount + charge;
  const canSubmit = numericAmount > 0 && receiverAccount.trim().length >= 6;

  function chooseMethod(method: CashOutMethod) {
    setSelectedMethod(method);
    setReceiverAccount('');
  }

  function submitRequest() {
    const requestId = `CASH-${Math.floor(4000 + Math.random() * 5000)}`;

    // Navigate to confirmation page with all transaction details
    router.push({
      pathname: '/cash-out-confirmation',
      params: {
        requestId,
        method: selectedMethod.name,
        providerSelected: providerLocked ? '1' : '0',
        receiverAccount: receiverAccount.trim(),
        amount: numericAmount.toString(),
        charge: charge.toString(),
        bonus: bonusAmount.toString(),
        bonusPercentis: bonusRate.percentis.toString(),
        note,
        totalDebit: totalDebit.toString(),
      },
    });
  }

  const stepValid = step === 1 ? receiverAccount.trim().length >= 6 : step === 2 ? canSubmit && Number.isFinite(numericAmount) : true;
  return (
    <TransactionStep title={t('cashOutPage.title')} step={step + 1 - (providerLocked ? 1 : 0)} total={providerLocked ? 4 : 5}
      onBack={() => step > (providerLocked ? 1 : 0) ? setStep(step - 1) : router.back()}
      onNext={() => step < 2 ? setStep(step + 1) : submitRequest()} disabled={!stepValid}>
      {step === 0 ? (<>        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('cashOutPage.method')}</Text>
          <View style={styles.methodGrid}>
            {cashOutMethods.filter(method => provider !== 'Bank' || method.type === 'Bank account').map((method) => {
              const active = method.name === selectedMethod.name;

              return (
                <Pressable
                  key={method.name}
                  style={[styles.methodCard, active && styles.methodCardActive]}
                  onPress={() => chooseMethod(method)}
                  accessibilityRole="button">
                  <WalletMiniLogo color={method.color} mark={method.mark} name={method.name} size={38} />
                  <Text style={styles.methodName}>{method.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

</>) : null}
      {step === 1 ? (<>        <View style={styles.panel}>
          <Text style={styles.panelTitle}>
            {selectedMethod.type === 'Mobile wallet'
              ? t('cashOutPage.mobileReceiverLabel', { method: selectedMethod.name })
              : t('cashOutPage.bankReceiverLabel')}
          </Text>
          <View style={styles.inputRow}>
            <MaterialIcons name={selectedMethod.icon} size={21} color={palette.muted} />
            <TextInput
              value={receiverAccount}
              onChangeText={setReceiverAccount}
              placeholder={selectedMethod.type === 'Mobile wallet'
                ? t('cashOutPage.mobilePlaceholder')
                : t('cashOutPage.bankPlaceholder')}
              placeholderTextColor={palette.muted}
              keyboardType={selectedMethod.type === 'Mobile wallet' ? 'phone-pad' : 'default'}
              style={styles.input}
            />
          </View>
          <View style={styles.methodInfo}>
            <MaterialIcons name="info" size={18} color={selectedMethod.color} />
            <Text style={styles.methodInfoText}>
              {t('cashOutPage.methodInfo', {
                type: t(selectedMethod.type === 'Mobile wallet' ? 'methodTypes.mobileWallet' : 'methodTypes.bankAccount').toLowerCase(),
              })}
            </Text>
          </View>
        </View>

</>) : null}
      {step === 2 ? (<>
        <Text style={styles.stepBalance}>{t('home.availableBalance')}: {formatCurrency(balance)}</Text>
                <View style={styles.amountPanel}>
          <View style={styles.amountHeader}>
            <Text style={styles.panelTitle}>{t('cashOutPage.amount')}</Text>
            <Text style={styles.balanceText}>{t('cashOutPage.availableLine', { amount: formatCurrency(balance) })}</Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.currencyPrefix}>৳</Text>
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
              placeholder={t('cashOutPage.notePlaceholder')}
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
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodCard: {
    width: '22.7%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 7,
  },
  methodCardActive: {
    borderColor: palette.coral,
    backgroundColor: palette.softCoral,
  },
  methodName: {
    color: palette.ink,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
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
  methodInfo: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: palette.background,
    borderRadius: 8,
    padding: 11,
  },
  methodInfoText: {
    flex: 1,
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  amountPanel: {
    gap: 16,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  balanceText: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  amountBox: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.softCoral,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    color: palette.coral,
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
    backgroundColor: palette.coral,
    borderColor: palette.coral,
  },
  quickAmountText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  quickAmountTextActive: {
    color: palette.surface,
  },
});

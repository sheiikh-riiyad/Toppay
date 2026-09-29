import TransactionStep from '@/components/TransactionStep';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

import { AddBalanceConfirmationModal } from '@/components/add-balance-confirmation-modal';
import WalletMiniLogo from '@/components/WalletMiniLogo';
import {
    addBalanceMethods,
    formatCurrency,
    palette,
    type AddBalanceMethod,
} from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';
import { usePaymentAccount } from '@/hooks/use-payment-account';
import { useSavedPaymentMethods } from '@/hooks/use-saved-payment-methods';
import { detectCardBrand, maskCardNumber, type SavedCardPaymentMethod } from '@/services/saved-payment-methods';
import { createAddBalanceRequest } from '@/services/wallet';
import { CardPaymentPinError, isValidCardPaymentPin } from '@/services/card-payment-pin';

const quickAmounts = ['1000', '2500', '5000', '10000'];
type FundingMode = 'manual' | 'card';

function makeLocalRequestId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function getMethodTypeKey(method: AddBalanceMethod) {
  if (method.type === 'Mobile wallet') {
    return 'methodTypes.mobileWallet';
  }

  if (method.type === 'Card') {
    return 'methodTypes.card';
  }

  return 'methodTypes.bankAccount';
}

function makeCardReviewMethod(card?: SavedCardPaymentMethod): AddBalanceMethod {
  return {
    name: card?.label || 'Saved Card',
    mark: card?.brand.slice(0, 2).toUpperCase() || 'CA',
    type: 'Card',
    receiverName: card?.cardholderName || '',
    receiverAccount: card?.maskedNumber || '',
    instruction: 'Card add money request',
    color: palette.coral,
    tone: palette.softCoral,
    icon: 'credit-card',
  };
}

export default function AddBalanceScreen() {
  const router = useRouter();
  const { provider } = useLocalSearchParams<{ provider?: string }>();
  const providerLocked = addBalanceMethods.some(method => method.name === provider);
  const { t } = useTranslation();
  const { account } = useAuth();
  const { cards: savedCards, isLoading: isLoadingSavedMethods } = useSavedPaymentMethods(account?.uid);
  const [fundingMode, setFundingMode] = useState<FundingMode>('manual');
  const [step, setStep] = useState(providerLocked ? 1 : 0);
  const [selectedMethod, setSelectedMethod] = useState<AddBalanceMethod>(() => addBalanceMethods.find(method => provider === 'Bank' ? method.type === 'Bank account' : method.name === provider) ?? addBalanceMethods[0]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [cardInputMode, setCardInputMode] = useState<'saved' | 'new'>('saved');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPaymentPin, setCardPaymentPin] = useState('');
  const { isLoading: isLoadingPaymentAccount, paymentAccount } = usePaymentAccount(selectedMethod.name);
  const [amount, setAmount] = useState('');
  const [trxId, setTrxId] = useState('');
  const [proofImageUri, setProofImageUri] = useState<string | undefined>();
  const [proofImageName, setProofImageName] = useState<string | undefined>();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const submitLockRef = useRef(false);
  const requestIdRef = useRef(makeLocalRequestId('ADD'));

  const numericAmount = Number(amount) || 0;
  const selectedCard = savedCards.find((card) => card.id === selectedCardId) || savedCards[0];
  const newCardDigits = cardNumber.replace(/\D/g, '');
  const newCardBrand = detectCardBrand(newCardDigits);
  const newCardMask = maskCardNumber(newCardDigits);
  const expiryFullYear = expiryYear.length === 2 ? 2000 + Number(expiryYear) : Number(expiryYear);
  const expiryDate = new Date(expiryFullYear, Number(expiryMonth), 0);
  const newCardValid = cardholderName.trim().length > 0
    && /^\d{12,19}$/.test(newCardDigits)
    && Number(expiryMonth) >= 1 && Number(expiryMonth) <= 12
    && /^\d{2}(\d{2})?$/.test(expiryYear)
    && expiryDate >= new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const cardForRequest: SavedCardPaymentMethod | undefined = cardInputMode === 'saved'
    ? selectedCard
    : newCardValid ? {
      id: '', kind: 'card', brand: newCardBrand, cardholderName: cardholderName.trim(),
      expiryMonth: expiryMonth.padStart(2, '0'), expiryYear,
      label: `${newCardBrand} •••• ${newCardMask.last4}`,
      last4: newCardMask.last4, maskedNumber: newCardMask.maskedNumber,
    } : undefined;
  const cardReviewMethod = makeCardReviewMethod(cardForRequest);
  const paymentAccountNumber = paymentAccount.number.trim();
  const selectedMethodWithAccount = useMemo(
    () => ({
      ...selectedMethod,
      receiverAccount: paymentAccountNumber,
    }),
    [paymentAccountNumber, selectedMethod]
  );
  const accountNumberText = isLoadingPaymentAccount
    ? t('common.loading')
    : paymentAccountNumber || t('generic.required');
  const isManualMode = fundingMode === 'manual';
  const hasValidCardCvv = /^\d{3,4}$/.test(cardCvv);
  const canUseCard = Boolean(cardForRequest) && (cardInputMode === 'new'
    ? hasValidCardCvv
    : Boolean(selectedCard?.hasPaymentPin) && isValidCardPaymentPin(cardPaymentPin) && !isLoadingSavedMethods);
  // Validation: amount must be > 0 and either TRX ID (6+ chars) OR proof image must be provided
  const canSubmit = numericAmount > 0
    && (isManualMode
      ? paymentAccountNumber.length > 0 && (trxId.trim().length >= 6 || !!proofImageUri) && !isLoadingPaymentAccount
      : canUseCard)
    && !isSubmitting;

  useEffect(() => {
    if (!selectedCardId && savedCards.length > 0) {
      setSelectedCardId(savedCards[0].id);
    }
  }, [savedCards, selectedCardId]);

  useEffect(() => {
    if (!isLoadingSavedMethods && savedCards.length === 0) setCardInputMode('new');
  }, [isLoadingSavedMethods, savedCards.length]);

  useEffect(() => {
    setCardPaymentPin('');
  }, [selectedCard?.id, cardInputMode, fundingMode]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setProofImageUri(asset.uri);
      // Extract filename from URI or use default
      const fileName = asset.fileName || asset.uri.split('/').pop() || 'payment-proof.jpg';
      setProofImageName(fileName);
    }
  }

  function handleShowConfirmation() {
    if (submitLockRef.current || isSubmitting) {
      return;
    }

    setSubmissionError('');
    setShowConfirmationModal(true);
  }

  async function handleConfirmSubmission() {
    if (submitLockRef.current || !canSubmit) {
      return;
    }

    if (!account) {
      setSubmissionError(t('login.googleFailed'));
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmissionError('');

    try {
      const cardRequest = fundingMode === 'card' ? cardForRequest : undefined;
      const transaction = await createAddBalanceRequest({
        uid: account.uid,
        requestId: requestIdRef.current,
        amount: numericAmount,
        method: cardRequest ? cardRequest.label : selectedMethod.name,
        trxId: cardRequest ? undefined : trxId.trim(),
        proofName: cardRequest ? undefined : proofImageName || 'payment-proof.jpg',
        proofImageUri: cardRequest ? undefined : proofImageUri || undefined,
        paymentSourceId: cardRequest?.id || undefined,
        paymentSourceLabel: cardRequest ? cardRequest.label : selectedMethod.name,
        paymentSourceMasked: cardRequest ? cardRequest.maskedNumber : paymentAccountNumber,
        paymentSourceType: cardRequest ? 'card' : 'manual',
        cardPaymentPin: cardRequest?.id ? cardPaymentPin : undefined,
      });

      setShowConfirmationModal(false);
      setCardCvv('');
      setCardPaymentPin('');
      router.replace({
        pathname: '/add-balance-submitted',
        params: {
          amount,
          method: cardRequest ? cardRequest.label : selectedMethod.name,
          requestId: transaction.requestId,
          trxId: cardRequest ? cardRequest.maskedNumber : trxId,
          proofName: cardRequest ? cardRequest.label : proofImageName || 'payment-proof.jpg',
          proofImageUri: cardRequest ? '' : proofImageUri || '',
        },
      });
    } catch (error) {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setShowConfirmationModal(false);
      if (error instanceof CardPaymentPinError) {
        setCardPaymentPin('');
        setStep(0);
        setSubmissionError(t('paymentMethods.pinError.' + error.reason));
      } else {
        setSubmissionError(t('addBalance.balanceAddFailed'));
      }
    }
  }

  const totalSteps = isManualMode ? (providerLocked ? 3 : 4) : 3;
  const visibleStep = step === 3 ? totalSteps : step + 1 - (providerLocked ? 1 : 0);
  const canAdvance = step === 0 ? (isManualMode ? Boolean(selectedMethod) : canUseCard)
    : step === 1 ? Number.isFinite(numericAmount) && numericAmount > 0
    : step === 2 ? paymentAccountNumber.length > 0 && !isLoadingPaymentAccount && (trxId.trim().length >= 6 || Boolean(proofImageUri))
    : canSubmit;
  function goBack() {
    if (step === 0 || (providerLocked && step === 1)) router.back();
    else setStep(step === 3 && !isManualMode ? 1 : step - 1);
  }
  function goNext() {
    if (step === 3) handleShowConfirmation();
    else setStep(step === 1 && !isManualMode ? 3 : step + 1);
  }
  return (
    <>
      <TransactionStep title={t('addBalancePage.title')} step={visibleStep} total={totalSteps} onBack={goBack} onNext={goNext} disabled={!canAdvance} busy={isSubmitting} nextLabel={step === 3 ? t('generic.reviewSubmit') : undefined}>
        {step === 0 ? (<>        {!provider && <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('addBalancePage.fundingSource')}</Text>
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeButton, isManualMode && styles.modeButtonActive]}
              onPress={() => setFundingMode('manual')}
              accessibilityRole="button">
              <MaterialIcons
                name="receipt-long"
                size={20}
                color={isManualMode ? palette.primary : palette.muted}
              />
              <View style={styles.modeCopy}>
                <Text style={[styles.modeTitle, isManualMode && styles.modeTitleActive]}>
                  {t('addBalancePage.manualTransfer')}
                </Text>
                <Text style={styles.modeMeta}>{t('addBalancePage.manualTransferMeta')}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.modeButton, !isManualMode && styles.modeButtonActive]}
              onPress={() => setFundingMode('card')}
              accessibilityRole="button">
              <MaterialIcons
                name="credit-card"
                size={20}
                color={!isManualMode ? palette.primary : palette.muted}
              />
              <View style={styles.modeCopy}>
                <Text style={[styles.modeTitle, !isManualMode && styles.modeTitleActive]}>
                  {t('addBalancePage.cardPayment')}
                </Text>
                <Text style={styles.modeMeta}>{t('addBalancePage.savedCardMeta')}</Text>
              </View>
            </Pressable>
          </View>
        </View>}

        {isManualMode ? (
          <>
            {!providerLocked && <View style={styles.panel}>
              <Text style={styles.panelTitle}>{t('addBalancePage.chooseChannel')}</Text>
              <View style={styles.methodGrid}>
                {addBalanceMethods.filter(method => provider !== 'Bank' || method.type === 'Bank account').map((method) => {
                  const active = method.name === selectedMethod.name;

                  return (
                    <Pressable
                      key={method.name}
                      style={[styles.methodCard, active && styles.methodCardActive]}
                      onPress={() => setSelectedMethod(method)}
                      accessibilityRole="button">
                      <WalletMiniLogo color={method.color} mark={method.mark} name={method.name} size={38} />
                      <Text style={styles.methodName}>{method.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>}

            {!providerLocked ? (<View style={styles.accountCard}>
              <View style={styles.accountTop}>
                <View style={[styles.accountIcon, { backgroundColor: selectedMethod.tone }]}>
                  <MaterialIcons name={selectedMethod.icon} size={24} color={selectedMethod.color} />
                </View>
                <View style={styles.accountCopy}>
                  <Text style={styles.accountName}>{selectedMethod.receiverName}</Text>
                  <Text style={styles.accountType}>{t(getMethodTypeKey(selectedMethod))}</Text>
                </View>
                <View style={styles.copyButton}>
                  <MaterialIcons name="content-copy" size={18} color={palette.primary} />
                </View>
              </View>
              <Text style={[
                styles.accountNumber,
                !paymentAccountNumber && styles.accountNumberMuted,
              ]}>
                {accountNumberText}
              </Text>
              <Text style={styles.accountInstruction}>
                {t(selectedMethod.type === 'Mobile wallet' ? 'addBalancePage.mobileInstruction' : 'addBalancePage.bankInstruction')}
              </Text>
            </View>) : null}
          </>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{t('addBalancePage.chooseCard')}</Text>
            <View style={styles.cardChoiceRow}>
              <Pressable
                style={[styles.cardChoiceButton, cardInputMode === 'saved' && styles.cardChoiceActive]}
                onPress={() => { setCardInputMode('saved'); setCardCvv(''); }}
                accessibilityRole="button">
                <Text style={styles.cardChoiceText}>{t('addBalancePage.savedCard')}</Text>
              </Pressable>
              <Pressable
                style={[styles.cardChoiceButton, cardInputMode === 'new' && styles.cardChoiceActive]}
                onPress={() => { setCardInputMode('new'); setCardCvv(''); }}
                accessibilityRole="button">
                <Text style={styles.cardChoiceText}>{t('addBalancePage.newCard')}</Text>
              </Pressable>
            </View>
            {cardInputMode === 'saved' ? (
              isLoadingSavedMethods ? <Text style={styles.emptyCardText}>{t('common.loading')}</Text>
                : savedCards.length === 0 ? <Text style={styles.emptyCardText}>{t('addBalancePage.noSavedCards')}</Text>
                  : savedCards.map((card) => {
                    const active = card.id === selectedCard?.id;
                    return (
                      <Pressable
                        key={card.id}
                        style={[styles.savedCardRow, active && styles.savedCardRowActive]}
                        onPress={() => { setSelectedCardId(card.id); setCardCvv(''); }}
                        accessibilityRole="button">
                        <View style={styles.savedCardIcon}>
                          <MaterialIcons name="credit-card" size={22} color={palette.coral} />
                        </View>
                        <View style={styles.savedCardCopy}>
                          <Text style={styles.savedCardTitle}>{card.label}</Text>
                          <Text style={styles.savedCardMeta}>{card.cardholderName} | {card.expiryMonth}/{card.expiryYear}</Text>
                        </View>
                        <MaterialIcons name={active ? 'radio-button-checked' : 'radio-button-unchecked'} size={22} color={active ? palette.primary : palette.muted} />
                      </Pressable>
                    );
                  })
            ) : (
              <>
                <TextInput style={styles.cardInput} placeholder={t('paymentMethods.cardholderName')} placeholderTextColor={palette.muted} value={cardholderName} onChangeText={setCardholderName} autoCapitalize="words" />
                <TextInput style={styles.cardInput} placeholder={t('paymentMethods.cardNumber')} placeholderTextColor={palette.muted} keyboardType="number-pad" maxLength={23} value={cardNumber} onChangeText={(value) => setCardNumber(value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim())} />
                <View style={styles.cardExpiryRow}>
                  <TextInput style={[styles.cardInput, styles.cardExpiryInput]} placeholder={t('paymentMethods.expiryMonth')} placeholderTextColor={palette.muted} keyboardType="number-pad" maxLength={2} value={expiryMonth} onChangeText={(value) => setExpiryMonth(value.replace(/\D/g, '').slice(0, 2))} />
                  <TextInput style={[styles.cardInput, styles.cardExpiryInput]} placeholder={t('paymentMethods.expiryYear')} placeholderTextColor={palette.muted} keyboardType="number-pad" maxLength={4} value={expiryYear} onChangeText={(value) => setExpiryYear(value.replace(/\D/g, '').slice(0, 4))} />
                </View>
              </>
            )}
            {cardInputMode === 'saved' ? <>
              <TextInput style={styles.cardInput} accessibilityLabel={t('paymentMethods.paymentPin')} placeholder={t('paymentMethods.paymentPin')} placeholderTextColor={palette.muted} keyboardType="number-pad" secureTextEntry autoComplete="off" maxLength={4} value={cardPaymentPin} onChangeText={(value) => setCardPaymentPin(value.replace(/\D/g, '').slice(0, 4))} />
              <Text style={styles.cardCvvNote}>{t('paymentMethods.enterPaymentPin')}</Text>
              {selectedCard && !selectedCard.hasPaymentPin ? (
                <Pressable style={styles.pendingLink} onPress={() => router.push('/payment-methods')} accessibilityRole="button">
                  <Text style={styles.pendingLinkText}>{t('paymentMethods.setupPinFirst')}</Text>
                </Pressable>
              ) : null}
            </> : <>
              <TextInput style={styles.cardInput} placeholder={t('addBalancePage.cardCvvPlaceholder')} placeholderTextColor={palette.muted} keyboardType="number-pad" secureTextEntry maxLength={4} value={cardCvv} onChangeText={(value) => setCardCvv(value.replace(/\D/g, '').slice(0, 4))} />
              <Text style={styles.cardCvvNote}>{t('addBalancePage.cardCvvNote')}</Text>
            </>}
            {submissionError ? <Text style={styles.errorText} accessibilityRole="alert">{submissionError}</Text> : null}
            <Text style={styles.accountInstruction}>{t('addBalancePage.cardRequestMeta')}</Text>
          </View>
        )}

</>) : null}
        {step === 1 ? (<>{providerLocked ? (<View style={styles.accountCard}>
              <View style={styles.accountTop}>
                <View style={[styles.accountIcon, { backgroundColor: selectedMethod.tone }]}>
                  <MaterialIcons name={selectedMethod.icon} size={24} color={selectedMethod.color} />
                </View>
                <View style={styles.accountCopy}>
                  <Text style={styles.accountName}>{selectedMethod.receiverName}</Text>
                  <Text style={styles.accountType}>{t(getMethodTypeKey(selectedMethod))}</Text>
                </View>
                <View style={styles.copyButton}>
                  <MaterialIcons name="content-copy" size={18} color={palette.primary} />
                </View>
              </View>
              <Text style={[
                styles.accountNumber,
                !paymentAccountNumber && styles.accountNumberMuted,
              ]}>
                {accountNumberText}
              </Text>
              <Text style={styles.accountInstruction}>
                {t(selectedMethod.type === 'Mobile wallet' ? 'addBalancePage.mobileInstruction' : 'addBalancePage.bankInstruction')}
              </Text>
            </View>) : null}        <View style={styles.amountPanel}>
          <Text style={styles.panelTitle}>{t('addBalancePage.amountPaid')}</Text>
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
        </View>

</>) : null}
        {step === 2 ? (<>        {isManualMode ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{t('addBalancePage.submitProof')}</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="receipt-long" size={21} color={palette.muted} />
              <TextInput
                value={trxId}
                onChangeText={setTrxId}
                placeholder={t('addBalancePage.trxPlaceholder')}
                placeholderTextColor={palette.muted}
                autoCapitalize="characters"
                style={styles.input}
              />
            </View>
            <Pressable
              style={styles.uploadBox}
              onPress={pickImage}
              accessibilityRole="button">
              <View style={styles.uploadIcon}>
                <MaterialIcons name="upload-file" size={24} color={palette.primary} />
              </View>
              <View style={styles.uploadCopy}>
                <Text style={styles.uploadTitle}>{t('addBalancePage.uploadScreenshot')}</Text>
                <Text style={styles.uploadMeta}>{proofImageName || t('addBalancePage.proofMeta')}</Text>
              </View>
            </Pressable>
            {proofImageUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: proofImageUri }} style={styles.imagePreview} resizeMode="cover" />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() => {
                    setProofImageUri(undefined);
                    setProofImageName(undefined);
                  }}
                  accessibilityRole="button">
                  <MaterialIcons name="close" size={18} color={palette.surface} />
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

</>) : null}
        {step === 3 ? (<>
                  <View style={styles.summaryCard}>
          <SummaryRow label={t('generic.channel')} value={isManualMode ? selectedMethod.name : cardForRequest?.label || t('paymentMethods.card')} />
          <SummaryRow label={t('generic.paidAmount')} value={formatCurrency(numericAmount)} />
          {isManualMode ? (
            <SummaryRow label={t('addBalance.transactionId')} value={trxId || t('generic.notProvided')} />
          ) : (
            <SummaryRow label={t('paymentMethods.card')} value={cardForRequest?.maskedNumber || t('generic.required')} />
          )}
          {isManualMode && proofImageName ? <SummaryRow label={t('generic.proofImage')} value={`✓ ${t('addBalancePage.attached')}`} /> : null}
          <View style={styles.summaryDivider} />
          <SummaryRow label={t('generic.approvalStatus')} value={t('generic.pendingReview')} strong />
        </View>

        <View style={styles.pendingCard}>
          <View style={styles.pendingIcon}>
            <MaterialIcons name="pending-actions" size={23} color={palette.amber} />
          </View>
          <View style={styles.pendingCopy}>
            <Text style={styles.pendingTitle}>{t('addBalancePage.balanceAfterApprovalTitle')}</Text>
            <Text style={styles.pendingMeta}>
              {t('addBalancePage.balanceAfterApprovalMeta')}
            </Text>
          </View>
        </View>


          {submissionError ? <Text style={styles.errorText}>{submissionError}</Text> : null}
          <Pressable style={styles.pendingLink} onPress={() => router.push('/pending-transactions')} accessibilityRole="button">
            <MaterialIcons name="history" size={19} color={palette.primary} />
            <Text style={styles.pendingLinkText}>{t('generic.pendingTransactions')}</Text>
          </Pressable>
        </>) : null}
      </TransactionStep>
              <AddBalanceConfirmationModal
          visible={showConfirmationModal}
          selectedMethod={isManualMode ? selectedMethodWithAccount : cardReviewMethod}
          amount={numericAmount}
          trxId={isManualMode ? trxId : cardForRequest?.maskedNumber || ''}
          proofImageUri={isManualMode ? proofImageUri : undefined}
          proofFileName={isManualMode ? proofImageName : undefined}
          referenceLabel={isManualMode ? undefined : t('paymentMethods.card')}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmSubmission}
          onEdit={() => setShowConfirmationModal(false)}
        />
    </>
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
  pendingLink: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  pendingLinkText: { color: palette.primary, fontSize: 14 },
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
    backgroundColor: palette.softPrimary,
  },
  heroCard: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
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
    color: '#FFE0ED',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 5,
  },
  stepRail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  stepItem: {
    alignItems: 'center',
    gap: 5,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softNeutral,
  },
  stepCircleActive: {
    backgroundColor: palette.primary,
  },
  stepNumber: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  stepNumberActive: {
    color: palette.surface,
  },
  stepLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
    marginHorizontal: 9,
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
  cardChoiceRow: { flexDirection: 'row', gap: 10 },
  cardChoiceButton: {
    flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: palette.border, borderRadius: 8,
    backgroundColor: palette.background,
  },
  cardChoiceActive: { borderColor: palette.primary, backgroundColor: palette.softPrimary },
  cardChoiceText: { color: palette.ink, fontSize: 13, fontWeight: '800' },
  cardInput: {
    minHeight: 50, borderWidth: 1, borderColor: palette.border,
    borderRadius: 8, backgroundColor: palette.background,
    paddingHorizontal: 12, color: palette.ink, fontSize: 14,
  },
  cardExpiryRow: { flexDirection: 'row', gap: 10 },
  cardExpiryInput: { flex: 1 },
  modeRow: {
    gap: 10,
  },
  modeButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  modeButtonActive: {
    backgroundColor: palette.softPrimary,
    borderColor: palette.primary,
  },
  modeCopy: {
    flex: 1,
  },
  modeTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  modeTitleActive: {
    color: palette.primary,
  },
  modeMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodCard: {
    width: '47.9%',
    minHeight: 98,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    justifyContent: 'space-between',
  },
  methodCardActive: {
    borderColor: palette.primary,
    backgroundColor: palette.softPrimary,
  },
  methodName: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  accountCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCopy: {
    flex: 1,
  },
  accountName: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  accountType: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  copyButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softPrimary,
  },
  accountNumber: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  accountNumberMuted: {
    color: palette.muted,
    fontSize: 16,
  },
  accountInstruction: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  cardPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  addCardButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    backgroundColor: palette.softPrimary,
    paddingHorizontal: 10,
  },
  addCardButtonText: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCardPanel: {
    gap: 8,
    borderRadius: 8,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  emptyCardTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyCardMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  emptyCardText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  manageCardButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: palette.primary,
  },
  manageCardButtonText: {
    color: palette.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  savedCardRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background,
    padding: 12,
  },
  savedCardRowActive: {
    borderColor: palette.primary,
    backgroundColor: palette.softPrimary,
  },
  savedCardIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.softCoral,
  },
  savedCardCopy: {
    flex: 1,
  },
  savedCardTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  savedCardMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  cardCvvBox: {
    gap: 7,
  },
  cardCvvNote: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
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
  uploadBox: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softPrimary,
  },
  uploadCopy: {
    flex: 1,
  },
  uploadTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  uploadMeta: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: palette.background,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
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
    color: palette.amber,
    fontSize: 15,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: palette.border,
  },
  pendingCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.softAmber,
    borderRadius: 8,
    padding: 14,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  pendingCopy: {
    flex: 1,
  },
  pendingTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  pendingMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  pendingPanel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  pendingPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingPanelTitle: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  pendingPanelMeta: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  pendingCountBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softAmber,
  },
  pendingCountText: {
    color: palette.amber,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyPendingText: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 12,
  },
  pendingRequestRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 10,
  },
  requestIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCopy: {
    flex: 1,
  },
  requestTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  requestMeta: {
    color: palette.muted,
    fontSize: 10,
    marginTop: 4,
  },
  requestProof: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  requestRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  requestAmount: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  requestStatus: {
    color: palette.amber,
    fontSize: 10,
    fontWeight: '900',
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
    backgroundColor: '#B99AA8',
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});

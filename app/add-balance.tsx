import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddBalanceConfirmationModal } from '@/components/add-balance-confirmation-modal';
import WalletMiniLogo from '@/components/WalletMiniLogo';
import { useAuth } from '@/contexts/auth';
import { usePaymentAccount } from '@/hooks/use-payment-account';
import { useSavedPaymentMethods } from '@/hooks/use-saved-payment-methods';
import { useWalletData } from '@/hooks/use-wallet-data';
import type { SavedCardPaymentMethod } from '@/services/saved-payment-methods';
import { createAddBalanceRequest, type WalletTransaction } from '@/services/wallet';
import {
    addBalanceMethods,
    formatCurrency,
    palette,
    type AddBalanceMethod,
    type PendingBalanceRequest,
} from '@/constants/toppay';

const quickAmounts = ['1000', '2500', '5000', '10000'];
const paymentMethodsRoute = '/payment-methods' as Href;

type FundingMode = 'manual' | 'card';

function makeLocalRequestId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function toPendingBalanceRequest(transaction: WalletTransaction): PendingBalanceRequest {
  const referenceText = transaction.paymentSourceType === 'card'
    ? `${transaction.paymentSourceLabel || 'Card'} ${transaction.paymentSourceMasked || ''}`.trim()
    : `TRX ${transaction.trxId || 'N/A'}`;

  return {
    id: transaction.requestId,
    method: transaction.method || 'Add balance',
    amount: transaction.amount,
    trxId: referenceText,
    proofName: transaction.proofName || 'Not attached',
    submittedAt: transaction.createdAtText,
    eta: 'Waiting for approval',
    status: 'Pending review',
    color: palette.amber,
    tone: palette.softAmber,
    icon: 'pending-actions',
  };
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
  const { t } = useTranslation();
  const { account } = useAuth();
  const { pendingTransactions } = useWalletData(account?.uid);
  const { cards: savedCards, isLoading: isLoadingSavedMethods } = useSavedPaymentMethods(account?.uid);
  const [fundingMode, setFundingMode] = useState<FundingMode>('manual');
  const [selectedMethod, setSelectedMethod] = useState<AddBalanceMethod>(addBalanceMethods[0]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const { isLoading: isLoadingPaymentAccount, paymentAccount } = usePaymentAccount(selectedMethod.name);
  const [amount, setAmount] = useState('5000');
  const [trxId, setTrxId] = useState('TXN8A91K24');
  const [proofImageUri, setProofImageUri] = useState<string | undefined>();
  const [proofImageName, setProofImageName] = useState<string | undefined>();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const submitLockRef = useRef(false);
  const requestIdRef = useRef(makeLocalRequestId('ADD'));

  const numericAmount = Number(amount) || 0;
  const selectedCard = savedCards.find((card) => card.id === selectedCardId) || savedCards[0];
  const cardReviewMethod = useMemo(() => makeCardReviewMethod(selectedCard), [selectedCard]);
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
  // Validation: amount must be > 0 and either TRX ID (6+ chars) OR proof image must be provided
  const canSubmit = numericAmount > 0
    && (isManualMode
      ? paymentAccountNumber.length > 0 && (trxId.trim().length >= 6 || !!proofImageUri) && !isLoadingPaymentAccount
      : Boolean(selectedCard) && hasValidCardCvv && !isLoadingSavedMethods)
    && !isSubmitting;
  const pendingBalanceRequests = pendingTransactions
    .filter((transaction) => transaction.type === 'add_balance')
    .map(toPendingBalanceRequest);

  useEffect(() => {
    if (!selectedCardId && savedCards.length > 0) {
      setSelectedCardId(savedCards[0].id);
    }
  }, [savedCards, selectedCardId]);

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
    if (submitLockRef.current) {
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
      const cardRequest = fundingMode === 'card' && selectedCard;
      const transaction = await createAddBalanceRequest({
        uid: account.uid,
        requestId: requestIdRef.current,
        amount: numericAmount,
        method: cardRequest ? cardRequest.label : selectedMethod.name,
        trxId: cardRequest ? undefined : trxId.trim(),
        proofName: cardRequest ? undefined : proofImageName || 'payment-proof.jpg',
        proofImageUri: cardRequest ? undefined : proofImageUri || undefined,
        paymentSourceId: cardRequest ? cardRequest.id : undefined,
        paymentSourceLabel: cardRequest ? cardRequest.label : selectedMethod.name,
        paymentSourceMasked: cardRequest ? cardRequest.maskedNumber : paymentAccountNumber,
        paymentSourceType: cardRequest ? 'card' : 'manual',
        cardVerificationProvided: cardRequest ? true : undefined,
        cardVerificationMode: cardRequest ? 'test' : undefined,
        cardVerificationLength: cardRequest ? cardCvv.length : undefined,
      });

      setShowConfirmationModal(false);
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
    } catch {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setSubmissionError(t('addBalance.balanceAddFailed'));
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('addBalancePage.kicker')}</Text>
            <Text style={styles.title}>{t('addBalancePage.title')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="verified-user" size={18} color={palette.primary} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="account-balance-wallet" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('addBalancePage.heroTitle')}</Text>
            <Text style={styles.heroMeta}>{t('addBalancePage.heroMeta')}</Text>
          </View>
        </View>

        <View style={styles.stepRail}>
          <StepBadge number="1" label={t('addBalancePage.stepPay')} active />
          <View style={styles.stepLine} />
          <StepBadge number="2" label={t('addBalancePage.stepSubmit')} active />
          <View style={styles.stepLine} />
          <StepBadge number="3" label={t('addBalancePage.stepApprove')} />
        </View>

        <View style={styles.panel}>
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
                  {t('addBalancePage.savedCard')}
                </Text>
                <Text style={styles.modeMeta}>{t('addBalancePage.savedCardMeta')}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {isManualMode ? (
          <>
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>{t('addBalancePage.chooseChannel')}</Text>
              <View style={styles.methodGrid}>
                {addBalanceMethods.map((method) => {
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
            </View>

            <View style={styles.accountCard}>
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
            </View>
          </>
        ) : (
          <View style={styles.panel}>
            <View style={styles.cardPanelHeader}>
              <Text style={styles.panelTitle}>{t('addBalancePage.chooseSavedCard')}</Text>
              <Pressable
                style={styles.addCardButton}
                onPress={() => router.push(paymentMethodsRoute)}
                accessibilityRole="button">
                <MaterialIcons name="add" size={18} color={palette.primary} />
                <Text style={styles.addCardButtonText}>{t('common.add')}</Text>
              </Pressable>
            </View>
            {isLoadingSavedMethods ? (
              <Text style={styles.emptyCardText}>{t('common.loading')}</Text>
            ) : savedCards.length === 0 ? (
              <View style={styles.emptyCardPanel}>
                <Text style={styles.emptyCardTitle}>{t('addBalancePage.noSavedCards')}</Text>
                <Text style={styles.emptyCardMeta}>{t('addBalancePage.noSavedCardsMeta')}</Text>
                <Pressable
                  style={styles.manageCardButton}
                  onPress={() => router.push(paymentMethodsRoute)}
                  accessibilityRole="button">
                  <MaterialIcons name="credit-card" size={18} color={palette.surface} />
                  <Text style={styles.manageCardButtonText}>{t('addBalancePage.addSavedCard')}</Text>
                </Pressable>
              </View>
            ) : (
              savedCards.map((card) => {
                const active = card.id === selectedCard?.id;

                return (
                  <Pressable
                    key={card.id}
                    style={[styles.savedCardRow, active && styles.savedCardRowActive]}
                    onPress={() => setSelectedCardId(card.id)}
                    accessibilityRole="button">
                    <View style={styles.savedCardIcon}>
                      <MaterialIcons name="credit-card" size={22} color={palette.coral} />
                    </View>
                    <View style={styles.savedCardCopy}>
                      <Text style={styles.savedCardTitle}>{card.label}</Text>
                      <Text style={styles.savedCardMeta}>
                        {card.cardholderName} | {card.expiryMonth}/{card.expiryYear}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={active ? palette.primary : palette.muted}
                    />
                  </Pressable>
                );
              })
            )}
            {selectedCard ? (
              <View style={styles.cardCvvBox}>
                <View style={styles.inputRow}>
                  <MaterialIcons name="lock" size={21} color={palette.muted} />
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    value={cardCvv}
                    onChangeText={(value) => setCardCvv(value.replace(/\D/g, '').slice(0, 4))}
                    placeholder={t('addBalancePage.cardCvvPlaceholder')}
                    placeholderTextColor={palette.muted}
                    style={styles.input}
                  />
                </View>
                <Text style={styles.cardCvvNote}>{t('addBalancePage.cardCvvNote')}</Text>
              </View>
            ) : null}
            <Text style={styles.accountInstruction}>{t('addBalancePage.cardRequestMeta')}</Text>
          </View>
        )}

        <View style={styles.amountPanel}>
          <Text style={styles.panelTitle}>{t('addBalancePage.amountPaid')}</Text>
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

        {isManualMode ? (
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

        <View style={styles.summaryCard}>
          <SummaryRow label={t('generic.channel')} value={isManualMode ? selectedMethod.name : selectedCard?.label || t('paymentMethods.card')} />
          <SummaryRow label={t('generic.paidAmount')} value={formatCurrency(numericAmount)} />
          {isManualMode ? (
            <SummaryRow label={t('addBalance.transactionId')} value={trxId || t('generic.notProvided')} />
          ) : (
            <SummaryRow label={t('paymentMethods.card')} value={selectedCard?.maskedNumber || t('generic.required')} />
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

        <PendingTransactionsPanel requests={pendingBalanceRequests} />

        {submissionError ? <Text style={styles.errorText}>{submissionError}</Text> : null}

        <Pressable
          style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
          disabled={!canSubmit}
          onPress={handleShowConfirmation}
          accessibilityRole="button">
          <MaterialIcons name="lock" size={18} color={palette.surface} />
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? t('common.loading') : t('generic.reviewSubmit')}
          </Text>
        </Pressable>

        <AddBalanceConfirmationModal
          visible={showConfirmationModal}
          selectedMethod={isManualMode ? selectedMethodWithAccount : cardReviewMethod}
          amount={numericAmount}
          trxId={isManualMode ? trxId : selectedCard?.maskedNumber || ''}
          proofImageUri={isManualMode ? proofImageUri : undefined}
          proofFileName={isManualMode ? proofImageName : undefined}
          referenceLabel={isManualMode ? undefined : t('paymentMethods.card')}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmSubmission}
          onEdit={() => setShowConfirmationModal(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingTransactionsPanel({ requests }: { requests: PendingBalanceRequest[] }) {
  const { t } = useTranslation();

  return (
    <View style={styles.pendingPanel}>
      <View style={styles.pendingPanelHeader}>
        <View>
          <Text style={styles.pendingPanelTitle}>{t('generic.pendingTransactions')}</Text>
          <Text style={styles.pendingPanelMeta}>{t('addBalancePage.pendingWaiting', { count: requests.length })}</Text>
        </View>
        <View style={styles.pendingCountBadge}>
          <Text style={styles.pendingCountText}>{requests.length}</Text>
        </View>
      </View>
      {requests.length === 0 ? (
        <Text style={styles.emptyPendingText}>{t('generic.noPendingTransactions')}</Text>
      ) : (
        requests.map((request) => (
          <View key={request.id} style={styles.pendingRequestRow}>
            <View style={[styles.requestIcon, { backgroundColor: request.tone }]}>
              <MaterialIcons name={request.icon} size={21} color={request.color} />
            </View>
            <View style={styles.requestCopy}>
              <Text style={styles.requestTitle}>{request.method}</Text>
              <Text style={styles.requestMeta}>
                {request.id}  |  {request.submittedAt}
              </Text>
              <Text style={styles.requestProof}>{request.trxId}</Text>
            </View>
            <View style={styles.requestRight}>
              <Text style={styles.requestAmount}>{formatCurrency(request.amount)}</Text>
              <Text style={styles.requestStatus}>{request.status}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function StepBadge({ number, label, active }: { number: string; label: string; active?: boolean }) {
  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
        <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{number}</Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
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
    color: '#CBECE2',
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
    backgroundColor: palette.softGreen,
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
    backgroundColor: palette.softGreen,
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
    backgroundColor: palette.softGreen,
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
    backgroundColor: palette.softGreen,
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
    backgroundColor: palette.softGreen,
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
    backgroundColor: palette.softGreen,
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
    backgroundColor: '#A8B7B0',
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

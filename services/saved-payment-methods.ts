import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { CardPaymentPinError, evaluateCardPaymentPinAttempt, hashCardPaymentPin, matchesCardPaymentPin, type CardPaymentPinRecord } from '@/services/card-payment-pin';
import { db } from '@/services/firebase';

export type SavedPaymentMethodKind = 'bank' | 'card';

export type SavedBankPaymentMethod = {
  id: string;
  kind: 'bank';
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  branchName?: string;
  label: string;
};

export type SavedCardPaymentMethod = {
  id: string;
  kind: 'card';
  brand: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cardNumber?: string;
  zipCode?: string;
  label: string;
  last4: string;
  maskedNumber: string;
  hasPaymentPin?: boolean;
};

export type SavedPaymentMethod = SavedBankPaymentMethod | SavedCardPaymentMethod;

export type SaveBankPaymentMethodInput = {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  branchName?: string;
};

export type SaveCardPaymentMethodInput = {
  paymentPin?: string;
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  zipCode?: string;
};

function getPaymentMethodsCollection(uid: string) {
  return collection(db, 'users', uid, 'paymentMethods');
}

function getPaymentMethodRef(uid: string, methodId: string) {
  return doc(db, 'users', uid, 'paymentMethods', methodId);
}

function cleanDigits(value: string) {
  return value.replace(/\D/g, '');
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function maskCardNumber(cardNumber: string) {
  const digits = cleanDigits(cardNumber);
  const last4 = digits.slice(-4);

  return {
    last4,
    maskedNumber: last4 ? `•••• •••• •••• ${last4}` : '',
  };
}

export function detectCardBrand(cardNumber: string) {
  const digits = cleanDigits(cardNumber);

  if (/^4/.test(digits)) {
    return 'Visa';
  }

  if (/^(5[1-5]|2[2-7])/.test(digits)) {
    return 'Mastercard';
  }

  if (/^3[47]/.test(digits)) {
    return 'American Express';
  }

  if (/^6(?:011|5)/.test(digits)) {
    return 'Discover';
  }

  return 'Card';
}

function mapSavedPaymentMethod(id: string, data: DocumentData): SavedPaymentMethod | null {
  if (data.kind === 'card') {
    const last4 = String(data.last4 || '');

    return {
      id,
      kind: 'card',
      hasPaymentPin: data.paymentPin?.version === 1 && typeof data.paymentPin?.hash === 'string',
      brand: String(data.brand || 'Card'),
      cardholderName: String(data.cardholderName || ''),
      expiryMonth: String(data.expiryMonth || ''),
      expiryYear: String(data.expiryYear || ''),
      cardNumber: data.cardNumber ? String(data.cardNumber) : undefined,
      zipCode: data.zipCode ? String(data.zipCode) : undefined,
      label: String(data.label || `${data.brand || 'Card'} •••• ${last4}`),
      last4,
      maskedNumber: String(data.maskedNumber || (last4 ? `•••• •••• •••• ${last4}` : '')),
    };
  }

  if (data.kind === 'bank') {
    const bankName = String(data.bankName || '');
    const accountNumber = String(data.accountNumber || '');

    return {
      id,
      kind: 'bank',
      accountHolderName: String(data.accountHolderName || ''),
      accountNumber,
      bankName,
      branchName: data.branchName ? String(data.branchName) : undefined,
      label: String(data.label || `${bankName} ${accountNumber}`.trim()),
    };
  }

  return null;
}

export function listenSavedPaymentMethods(
  uid: string,
  onChange: (methods: SavedPaymentMethod[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const methodsQuery = query(getPaymentMethodsCollection(uid), orderBy('createdAt', 'desc'));

  return onSnapshot(
    methodsQuery,
    (snapshot) => {
      const methods = snapshot.docs
        .map((item) => mapSavedPaymentMethod(item.id, item.data()))
        .filter((item): item is SavedPaymentMethod => Boolean(item));

      onChange(methods);
    },
    (error) => onError?.(error)
  );
}

export async function saveBankPaymentMethod(uid: string, input: SaveBankPaymentMethodInput) {
  const methodRef = doc(getPaymentMethodsCollection(uid));
  const bankName = cleanText(input.bankName);
  const accountHolderName = cleanText(input.accountHolderName);
  const accountNumber = cleanText(input.accountNumber);
  const branchName = cleanText(input.branchName || '');
  const timestamp = serverTimestamp();

  await setDoc(methodRef, {
    uid,
    kind: 'bank',
    bankName,
    accountHolderName,
    accountNumber,
    branchName,
    label: `${bankName} ${accountNumber}`.trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return methodRef.id;
}

export async function saveCardPaymentMethod(uid: string, input: SaveCardPaymentMethodInput) {
  const cardNumber = cleanDigits(input.cardNumber);

  if (cardNumber.length < 12) {
    throw new Error('Card number is too short.');
  }

  const methodRef = doc(getPaymentMethodsCollection(uid));
  const { last4, maskedNumber } = maskCardNumber(cardNumber);
  const brand = detectCardBrand(cardNumber);
  const cardholderName = cleanText(input.cardholderName);
  const zipCode = cleanText(input.zipCode || '');
  const expiryMonth = cleanDigits(input.expiryMonth).padStart(2, '0').slice(-2);
  const expiryYear = cleanDigits(input.expiryYear).slice(-4);
  const monthNumber = Number(expiryMonth);
  const timestamp = serverTimestamp();

  if (monthNumber < 1 || monthNumber > 12 || expiryYear.length < 2 || !zipCode) {
    throw new Error('Card expiry is invalid.');
  }

  const paymentPin = input.paymentPin ? await hashCardPaymentPin(input.paymentPin, uid + ':' + methodRef.id) : undefined;
  await setDoc(methodRef, {
    uid,
    kind: 'card',
    brand,
    cardholderName,
    expiryMonth,
    expiryYear,
    cardNumber,
    zipCode,
    label: `${brand} •••• ${last4}`,
    last4,
    maskedNumber,
    ...(paymentPin ? { paymentPin } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return methodRef.id;
}

export async function setSavedCardPaymentPin(uid: string, methodId: string, pin: string) {
  const methodRef = getPaymentMethodRef(uid, methodId);
  const paymentPin = await hashCardPaymentPin(pin, uid + ':' + methodId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(methodRef);
    const data = snapshot.data();
    if (!snapshot.exists() || data?.kind !== 'card') throw new CardPaymentPinError('missing');
    // Legacy cards may enroll once; never silently replace an existing PIN.
    if (data.paymentPin) throw new CardPaymentPinError('changed');
    transaction.update(methodRef, { paymentPin, updatedAt: serverTimestamp() });
  });
}

export async function verifySavedCardPaymentPin(uid: string, methodId: string, pin: string) {
  const methodRef = getPaymentMethodRef(uid, methodId);
  const snapshot = await getDocFromServer(methodRef);
  const data = snapshot.data();
  const record = data?.paymentPin as CardPaymentPinRecord | undefined;
  if (data?.kind !== 'card' || !record) throw new CardPaymentPinError('missing');
  if (Number(data.paymentPinLockedUntil) > Date.now()) throw new CardPaymentPinError('locked');
  const matches = await matchesCardPaymentPin(pin, record);
  const result = await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(methodRef)).data();
    if (current?.paymentPin?.hash !== record.hash || current?.paymentPin?.salt !== record.salt) return 'changed';
    const attempt = evaluateCardPaymentPinAttempt(matches, current, Date.now());
    if (attempt.updates) transaction.update(methodRef, attempt.updates);
    return attempt.result;
  });
  if (result !== 'ok') throw new CardPaymentPinError(result);
}

export async function deleteSavedPaymentMethod(uid: string, methodId: string) {
  await deleteDoc(getPaymentMethodRef(uid, methodId));
}

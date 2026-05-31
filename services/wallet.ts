import {
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/services/firebase';

export type WalletTransactionType = 'add_balance' | 'send_money' | 'cash_out' | 'mobile_recharge' | 'bill_payment' | 'system';
export type WalletTransactionStatus = 'pending' | 'done' | 'failed' | 'rejected';
export type WalletTransactionDirection = 'in' | 'out' | 'neutral';

export type WalletSummary = {
  uid: string;
  balance: number;
  currency: string;
  rewardPoints: number;
  monthlyLimit: number;
  monthlyUsed: number;
  status: 'active' | 'blocked' | 'review';
};

export type WalletTransaction = {
  id: string;
  requestId: string;
  uid: string;
  type: WalletTransactionType;
  title: string;
  method?: string;
  amount: number;
  fee: number;
  bonus: number;
  totalDebit: number;
  currency: string;
  status: WalletTransactionStatus;
  direction: WalletTransactionDirection;
  balanceImpact: number;
  balanceApplied: boolean;
  receiverName?: string;
  receiverPhone?: string;
  receiverAccount?: string;
  billingId?: string;
  billerCategory?: string;
  billDate?: string;
  billType?: string;
  trxId?: string;
  proofName?: string;
  proofImageUri?: string;
  paymentSourceId?: string;
  paymentSourceLabel?: string;
  paymentSourceMasked?: string;
  paymentSourceType?: 'manual' | 'card';
  cardVerificationProvided?: boolean;
  cardVerificationMode?: 'test' | 'live';
  cardVerificationLength?: number;
  note?: string;
  createdAtText: string;
};

type CreateAddBalanceRequestInput = {
  uid: string;
  requestId?: string;
  method: string;
  amount: number;
  trxId?: string;
  proofName?: string;
  proofImageUri?: string;
  paymentSourceId?: string;
  paymentSourceLabel?: string;
  paymentSourceMasked?: string;
  paymentSourceType?: 'manual' | 'card';
  cardVerificationProvided?: boolean;
  cardVerificationMode?: 'test' | 'live';
  cardVerificationLength?: number;
};

type CreateCashOutRequestInput = {
  uid: string;
  requestId?: string;
  method: string;
  receiverAccount: string;
  amount: number;
  charge: number;
  bonus: number;
  totalDebit: number;
  note?: string;
};

type CreateSendMoneyRequestInput = {
  uid: string;
  requestId?: string;
  method: string;
  receiverName: string;
  receiverPhone: string;
  amount: number;
  bonus?: number;
  note?: string;
};

type CreateMobileRechargeRequestInput = {
  uid: string;
  requestId?: string;
  provider: string;
  receiverName: string;
  receiverPhone: string;
  amount: number;
};

type CreateBillPaymentRequestInput = {
  uid: string;
  requestId?: string;
  billerName: string;
  billerCategory: string;
  billingId: string;
  billDate?: string;
  billType?: string;
  amount: number;
};

const defaultWalletSummary: WalletSummary = {
  uid: '',
  balance: 0,
  currency: 'BDT',
  rewardPoints: 0,
  monthlyLimit: 150000,
  monthlyUsed: 0,
  status: 'active',
};

function makeRequestId(prefix: string, id: string) {
  return `${prefix}-${id.slice(0, 6).toUpperCase()}`;
}

function cleanDocumentId(value: string) {
  return value.trim().replace(/\//g, '-');
}

function getTransactionIdentity(uid: string, prefix: string, requestId?: string) {
  const normalizedRequestId = requestId ? cleanDocumentId(requestId) : '';

  if (normalizedRequestId) {
    return {
      requestId: normalizedRequestId,
      transactionRef: doc(db, 'users', uid, 'transactions', normalizedRequestId),
    };
  }

  const transactionRef = doc(collection(db, 'users', uid, 'transactions'));

  return {
    requestId: makeRequestId(prefix, transactionRef.id),
    transactionRef,
  };
}

function cleanData<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== '')
  );
}

function normalizeStatus(status: unknown): WalletTransactionStatus {
  if (status === 'done' || status === 'Completed' || status === 'Approved') {
    return 'done';
  }

  if (status === 'failed' || status === 'Failed') {
    return 'failed';
  }

  if (status === 'rejected' || status === 'Rejected') {
    return 'rejected';
  }

  return 'pending';
}

function normalizeDirection(direction: unknown, amount: number): WalletTransactionDirection {
  if (direction === 'in' || direction === 'out' || direction === 'neutral') {
    return direction;
  }

  if (amount > 0) {
    return 'in';
  }

  if (amount < 0) {
    return 'out';
  }

  return 'neutral';
}

function timestampToText(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString();
  }

  return 'Just now';
}

function mapWalletSummary(uid: string, data?: DocumentData): WalletSummary {
  return {
    ...defaultWalletSummary,
    uid,
    balance: Number(data?.balance) || 0,
    currency: data?.currency || 'BDT',
    rewardPoints: Number(data?.rewardPoints) || 0,
    monthlyLimit: Number(data?.monthlyLimit) || 150000,
    monthlyUsed: Number(data?.monthlyUsed) || 0,
    status: data?.status || 'active',
  };
}

function mapWalletTransaction(id: string, data: DocumentData): WalletTransaction {
  const amount = Number(data.amount) || 0;
  const fee = Number(data.fee ?? data.charge) || 0;
  const totalDebit = Number(data.totalDebit) || Math.abs(amount) + fee;

  return {
    id,
    requestId: data.requestId || id,
    uid: data.uid || '',
    type: data.type || 'system',
    title: data.title || 'Transaction',
    method: data.method,
    amount,
    fee,
    bonus: Number(data.bonus) || 0,
    totalDebit,
    currency: data.currency || 'BDT',
    status: normalizeStatus(data.status),
    direction: normalizeDirection(data.direction, amount),
    balanceImpact: Number(data.balanceImpact) || amount,
    balanceApplied: Boolean(data.balanceApplied),
    receiverName: data.receiverName,
    receiverPhone: data.receiverPhone,
    receiverAccount: data.receiverAccount,
    billingId: data.billingId,
    billerCategory: data.billerCategory,
    billDate: data.billDate,
    billType: data.billType,
    trxId: data.trxId,
    proofName: data.proofName,
    proofImageUri: data.proofImageUri,
    paymentSourceId: data.paymentSourceId,
    paymentSourceLabel: data.paymentSourceLabel,
    paymentSourceMasked: data.paymentSourceMasked,
    paymentSourceType: data.paymentSourceType,
    cardVerificationProvided: Boolean(data.cardVerificationProvided),
    cardVerificationMode: data.cardVerificationMode,
    cardVerificationLength: Number(data.cardVerificationLength) || undefined,
    note: data.note,
    createdAtText: timestampToText(data.createdAt),
  };
}

async function writeTransactionRequest(transaction: Record<string, unknown>) {
  const transactionId = String(transaction.id);
  const uid = String(transaction.uid);
  const timestamp = serverTimestamp();
  const userTransactionRef = doc(db, 'users', uid, 'transactions', transactionId);
  const rootTransactionRef = doc(db, 'transactionRequests', transactionId);
  const payload = cleanData({
    ...transaction,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const batch = writeBatch(db);

  batch.set(userTransactionRef, payload);
  batch.set(rootTransactionRef, payload);
  await batch.commit();
}

export function listenWalletSummary(
  uid: string,
  onChange: (summary: WalletSummary) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid, 'wallet', 'summary'),
    (snapshot) => onChange(mapWalletSummary(uid, snapshot.data())),
    (error) => onError?.(error)
  );
}

export function listenUserTransactions(
  uid: string,
  onChange: (transactions: WalletTransaction[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const transactionsQuery = query(
    collection(db, 'users', uid, 'transactions'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    transactionsQuery,
    (snapshot) => onChange(snapshot.docs.map((item) => mapWalletTransaction(item.id, item.data()))),
    (error) => onError?.(error)
  );
}

export async function createAddBalanceRequest(input: CreateAddBalanceRequestInput) {
  const { requestId, transactionRef } = getTransactionIdentity(input.uid, 'ADD', input.requestId);
  const transaction: WalletTransaction = {
    id: transactionRef.id,
    requestId,
    uid: input.uid,
    type: 'add_balance',
    title: `Add balance via ${input.paymentSourceLabel || input.method}`,
    method: input.method,
    amount: input.amount,
    fee: 0,
    bonus: 0,
    totalDebit: 0,
    currency: 'BDT',
    status: 'pending',
    direction: 'in',
    balanceImpact: input.amount,
    balanceApplied: false,
    trxId: input.trxId,
    proofName: input.proofName,
    proofImageUri: input.proofImageUri,
    paymentSourceId: input.paymentSourceId,
    paymentSourceLabel: input.paymentSourceLabel,
    paymentSourceMasked: input.paymentSourceMasked,
    paymentSourceType: input.paymentSourceType || 'manual',
    cardVerificationProvided: input.cardVerificationProvided,
    cardVerificationMode: input.cardVerificationMode,
    cardVerificationLength: input.cardVerificationLength,
    createdAtText: 'Just now',
  };

  await writeTransactionRequest(transaction);
  return transaction;
}

export async function createCashOutRequest(input: CreateCashOutRequestInput) {
  const { requestId, transactionRef } = getTransactionIdentity(input.uid, 'CASH', input.requestId);
  const transaction: WalletTransaction = {
    id: transactionRef.id,
    requestId,
    uid: input.uid,
    type: 'cash_out',
    title: `Cash out to ${input.method}`,
    method: input.method,
    amount: input.amount,
    fee: input.charge,
    bonus: input.bonus,
    totalDebit: input.totalDebit,
    currency: 'BDT',
    status: 'pending',
    direction: 'out',
    balanceImpact: -input.totalDebit,
    balanceApplied: false,
    receiverAccount: input.receiverAccount,
    note: input.note,
    createdAtText: 'Just now',
  };

  await writeTransactionRequest(transaction);
  return transaction;
}

export async function createSendMoneyRequest(input: CreateSendMoneyRequestInput) {
  const { requestId, transactionRef } = getTransactionIdentity(input.uid, 'SEND', input.requestId);
  const transaction: WalletTransaction = {
    id: transactionRef.id,
    requestId,
    uid: input.uid,
    type: 'send_money',
    title: `Send money to ${input.receiverName}`,
    method: input.method,
    amount: input.amount,
    fee: 0,
    bonus: input.bonus ?? 0,
    totalDebit: input.amount,
    currency: 'BDT',
    status: 'pending',
    direction: 'out',
    balanceImpact: -input.amount,
    balanceApplied: false,
    receiverName: input.receiverName,
    receiverPhone: input.receiverPhone,
    note: input.note,
    createdAtText: 'Just now',
  };

  await writeTransactionRequest(transaction);
  return transaction;
}

export async function createMobileRechargeRequest(input: CreateMobileRechargeRequestInput) {
  const { requestId, transactionRef } = getTransactionIdentity(input.uid, 'RECH', input.requestId);
  const transaction: WalletTransaction = {
    id: transactionRef.id,
    requestId,
    uid: input.uid,
    type: 'mobile_recharge',
    title: `${input.provider} recharge`,
    method: input.provider,
    amount: input.amount,
    fee: 0,
    bonus: 0,
    totalDebit: input.amount,
    currency: 'BDT',
    status: 'pending',
    direction: 'out',
    balanceImpact: -input.amount,
    balanceApplied: false,
    receiverName: input.receiverName,
    receiverPhone: input.receiverPhone,
    note: 'Mobile recharge',
    createdAtText: 'Just now',
  };

  await writeTransactionRequest(transaction);
  return transaction;
}

export async function createBillPaymentRequest(input: CreateBillPaymentRequestInput) {
  const { requestId, transactionRef } = getTransactionIdentity(input.uid, 'BILL', input.requestId);
  const transaction: WalletTransaction = {
    id: transactionRef.id,
    requestId,
    uid: input.uid,
    type: 'bill_payment',
    title: `${input.billerName} bill payment`,
    method: input.billerName,
    amount: input.amount,
    fee: 0,
    bonus: 0,
    totalDebit: input.amount,
    currency: 'BDT',
    status: 'pending',
    direction: 'out',
    balanceImpact: -input.amount,
    balanceApplied: false,
    billingId: input.billingId,
    billerCategory: input.billerCategory,
    billDate: input.billDate,
    billType: input.billType,
    note: 'Bill payment',
    createdAtText: 'Just now',
  };

  await writeTransactionRequest(transaction);
  return transaction;
}

export async function completeTransactionForAdminOnly(uid: string, transactionId: string) {
  const userTransactionRef = doc(db, 'users', uid, 'transactions', transactionId);
  const rootTransactionRef = doc(db, 'transactionRequests', transactionId);
  const walletRef = doc(db, 'users', uid, 'wallet', 'summary');
  const snapshot = await getDoc(userTransactionRef);

  if (!snapshot.exists()) {
    throw new Error('Transaction not found');
  }

  const transaction = mapWalletTransaction(snapshot.id, snapshot.data());

  if (transaction.balanceApplied) {
    return transaction;
  }

  const timestamp = serverTimestamp();
  const batch = writeBatch(db);

  batch.set(userTransactionRef, {
    status: 'done',
    balanceApplied: true,
    completedAt: timestamp,
    updatedAt: timestamp,
  }, { merge: true });
  batch.set(rootTransactionRef, {
    status: 'done',
    balanceApplied: true,
    completedAt: timestamp,
    updatedAt: timestamp,
  }, { merge: true });
  batch.set(walletRef, {
    balance: increment(transaction.balanceImpact),
    monthlyUsed: transaction.balanceImpact < 0 ? increment(Math.abs(transaction.balanceImpact)) : increment(0),
    updatedAt: timestamp,
  }, { merge: true });

  await batch.commit();
  return transaction;
}

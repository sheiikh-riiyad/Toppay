import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    startAfter,
    type DocumentData,
    type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { auth, db, firebaseApp } from '@/services/firebase';

const PAGE_SIZE = 50;

export async function verifyCurrentAdmin() {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return false;
  const profile = await getDoc(doc(db, 'users', user.uid));
  return profile.data()?.admin === true;
}

type DirectoryRecord = {
  uid: string;
  name: string;
  email: string;
  initials: string;
  hasPersonalInformation?: boolean;
  personalInformationStatus?: string;
  createdAt?: { toMillis?: () => number };
};

export type AdminUserSummary = {
  uid: string;
  name: string;
  email: string;
  initials: string;
  hasPersonalInformation: boolean;
  personalInformationStatus: string;
  createdAtMs: number;
};

export type AdminUserProfile = AdminUserSummary & {
  balance: number;
  currency: string;
  walletStatus: string;
  monthlyLimit: number;
  monthlyUsed: number;
};

export type AdminPaymentMethod = {
  id: string;
  kind: 'card' | 'bank';
  brand?: string;
  cardholderName?: string;
  last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
  zipCode?: string;
  phoneNumber?: string;
  hasPaymentPin?: boolean;
  savedAtMs?: number;
  bankName?: string;
  accountHolderName?: string;
  accountLast4?: string;
  branchName?: string;
};

export type AdminUserTransaction = {
  id: string;
  requestId: string;
  type: string;
  title: string;
  method: string;
  amount: number;
  fee: number;
  bonus: number;
  totalDebit: number;
  balanceImpact: number;
  balanceApplied: boolean;
  status: string;
  direction: string;
  receiverName: string;
  receiverPhone: string;
  receiverAccount: string;
  receiverBankName: string;
  receiverBranch: string;
  receiverRoutingNumber: string;
  billingId: string;
  billerCategory: string;
  billDate: string;
  billType: string;
  trxId: string;
  proofName: string;
  paymentSourceLabel: string;
  paymentSourceMasked: string;
  paymentCardholderName: string;
  paymentCardExpiryMonth: string;
  paymentCardExpiryYear: string;
  paymentCardBillingZip: string;
  note: string;
  createdAtMs: number;
  reviewedAtMs: number;
};

export type AdminUserDetails = {
  wallet: { balance: number; currency: string; status: string; monthlyLimit: number; monthlyUsed: number; rewardPoints: number };
  personal: null | { fullName: string; fatherName: string; address: string; zipCode: string; documentType: string; verificationStatus: string };
  paymentMethods: AdminPaymentMethod[];
  transactions: AdminUserTransaction[];
  nextCursor: string | null;
};

export async function getAdminUserDetails(uid: string, cursor?: string): Promise<AdminUserDetails> {
  const call = httpsCallable<{ uid: string; cursor?: string }, AdminUserDetails>(getFunctions(firebaseApp), 'getAdminUserDetails');
  const result = await call({ uid, ...(cursor ? { cursor } : {}) });
  return result.data;
}

function mapDirectoryRecord(data: DocumentData, id: string): AdminUserSummary {
  const record = data as DirectoryRecord;
  return {
    uid: String(record.uid || id),
    name: String(record.name || 'Toppay user'),
    email: String(record.email || ''),
    initials: String(record.initials || 'TP'),
    hasPersonalInformation: Boolean(record.hasPersonalInformation),
    personalInformationStatus: String(record.personalInformationStatus || 'incomplete'),
    createdAtMs: typeof record.createdAt?.toMillis === 'function' ? record.createdAt.toMillis() : 0,
  };
}

export async function listAdminUsers(cursor?: QueryDocumentSnapshot<DocumentData> | null) {
  const directory = collection(db, 'adminUserDirectory');
  const usersQuery = cursor
    ? query(directory, orderBy('createdAt', 'desc'), startAfter(cursor), limit(PAGE_SIZE))
    : query(directory, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
  const snapshot = await getDocs(usersQuery);

  return {
    users: snapshot.docs.map((item) => mapDirectoryRecord(item.data(), item.id)),
    nextCursor: snapshot.docs.length === PAGE_SIZE ? snapshot.docs[snapshot.docs.length - 1] : null,
  };
}

export async function getAdminUserProfile(uid: string): Promise<AdminUserProfile | null> {
  const [directorySnapshot, walletSnapshot] = await Promise.all([
    getDoc(doc(db, 'adminUserDirectory', uid)),
    getDoc(doc(db, 'users', uid, 'wallet', 'summary')),
  ]);
  if (!directorySnapshot.exists()) return null;

  const user = mapDirectoryRecord(directorySnapshot.data(), directorySnapshot.id);
  const wallet = walletSnapshot.data();
  return {
    ...user,
    balance: Number(wallet?.balance) || 0,
    currency: String(wallet?.currency || 'BDT'),
    walletStatus: String(wallet?.status || 'active'),
    monthlyLimit: Number(wallet?.monthlyLimit) || 150000,
    monthlyUsed: Number(wallet?.monthlyUsed) || 0,
  };
}

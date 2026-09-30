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

import { auth, db } from '@/services/firebase';

const PAGE_SIZE = 50;

export async function verifyCurrentAdmin() {
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

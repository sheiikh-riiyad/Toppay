import {
    collection,
    doc,
    getDocs,
    increment,
    limit,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    where,
} from 'firebase/firestore';

import { db } from '@/services/firebase';
import type { WalletTransaction } from '@/services/wallet';

export type AdminRequest = WalletTransaction & { createdAtMs: number };
export type AdminDecision = 'approve' | 'reject';

export async function listPendingAdminRequests() {
  const requestsQuery = query(
    collection(db, 'transactionRequests'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  const snapshot = await getDocs(requestsQuery);

  return snapshot.docs.map((item) => {
    const data = item.data();
    const createdAtMs = typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : 0;
    return {
      ...data,
      id: item.id,
      requestId: String(data.requestId || item.id),
      uid: String(data.uid || ''),
      type: data.type as WalletTransaction['type'],
      title: String(data.title || 'Transaction'),
      amount: Number(data.amount) || 0,
      createdAtMs,
      createdAtText: createdAtMs ? new Date(createdAtMs).toISOString() : 'Just now',
    } as AdminRequest;
  });
}

export async function reviewAdminRequest(input: {
  uid: string;
  transactionId: string;
  decision: AdminDecision;
}) {
  const rootRequestRef = doc(db, 'transactionRequests', input.transactionId);
  const userRequestRef = doc(db, 'users', input.uid, 'transactions', input.transactionId);
  const walletRef = doc(db, 'users', input.uid, 'wallet', 'summary');

  return runTransaction(db, async (transaction) => {
    const [rootSnapshot, userSnapshot, walletSnapshot] = await Promise.all([
      transaction.get(rootRequestRef),
      transaction.get(userRequestRef),
      transaction.get(walletRef),
    ]);
    if (!rootSnapshot.exists() || !userSnapshot.exists()) throw new Error('Transaction request not found.');

    const rootRequest = rootSnapshot.data();
    const userRequest = userSnapshot.data();
    if (rootRequest.uid !== input.uid || userRequest.uid !== input.uid) throw new Error('Transaction owner mismatch.');
    if (rootRequest.status !== 'pending' || userRequest.status !== 'pending' || userRequest.balanceApplied) {
      throw new Error('Transaction has already been reviewed.');
    }

    const approved = input.decision === 'approve';
    const reviewedAt = serverTimestamp();
    const update = {
      status: approved ? 'done' : 'rejected',
      balanceApplied: approved,
      reviewedAt,
      updatedAt: reviewedAt,
    };
    transaction.update(rootRequestRef, update);
    transaction.update(userRequestRef, update);

    if (approved) {
      const balanceImpact = Number(userRequest.balanceImpact);
      if (!Number.isFinite(balanceImpact)) throw new Error('Invalid wallet balance impact.');
      if (userRequest.type === 'bank_transfer' && balanceImpact < 0 &&
        (Number(walletSnapshot.data()?.balance) || 0) < Math.abs(balanceImpact)) {
        throw new Error('Insufficient wallet balance for bank transfer.');
      }
      transaction.set(walletRef, {
        balance: increment(balanceImpact),
        monthlyUsed: balanceImpact < 0 ? increment(Math.abs(balanceImpact)) : increment(0),
        updatedAt: reviewedAt,
      }, { merge: true });
    }

    return approved ? 'done' : 'rejected';
  });
}

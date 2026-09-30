const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

initializeApp();

const db = getFirestore();

async function requireAdmin(uid) {
  const userSnapshot = await db.doc(`users/${uid}`).get();
  if (userSnapshot.data()?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin access is required.');
  }
}

function getCallerUid(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return request.auth.uid;
}

exports.listPendingAdminRequests = onCall(async (request) => {
  await requireAdmin(getCallerUid(request));

  const snapshot = await db.collection('transactionRequests')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  return {
    requests: snapshot.docs.map((item) => {
      const { createdAt, updatedAt, ...data } = item.data();
      const createdAtMs = createdAt?.toMillis?.() ?? 0;
      return {
        ...data,
        id: item.id,
        createdAtMs,
        createdAtText: createdAtMs ? new Date(createdAtMs).toISOString() : 'Just now',
      };
    }),
  };
});

exports.reviewAdminRequest = onCall(async (request) => {
  const adminUid = getCallerUid(request);
  const transactionId = String(request.data?.transactionId ?? '');
  const uid = String(request.data?.uid ?? '');
  const decision = request.data?.decision;

  if (!transactionId || transactionId.includes('/') || !uid || uid.includes('/')) {
    throw new HttpsError('invalid-argument', 'A valid request and user ID are required.');
  }
  if (decision !== 'approve' && decision !== 'reject') {
    throw new HttpsError('invalid-argument', 'Choose approve or reject.');
  }

  const userRef = db.doc(`users/${uid}`);
  const userTransactionRef = db.doc(`users/${uid}/transactions/${transactionId}`);
  const requestRef = db.doc(`transactionRequests/${transactionId}`);
  const walletRef = db.doc(`users/${uid}/wallet/summary`);

  await db.runTransaction(async (transaction) => {
    const [adminSnapshot, requestSnapshot, userTransactionSnapshot] = await Promise.all([
      transaction.get(db.doc(`users/${adminUid}`)),
      transaction.get(requestRef),
      transaction.get(userTransactionRef),
    ]);

    if (adminSnapshot.data()?.admin !== true) {
      throw new HttpsError('permission-denied', 'Admin access is required.');
    }
    if (!requestSnapshot.exists || !userTransactionSnapshot.exists) {
      throw new HttpsError('not-found', 'The transaction request was not found.');
    }

    const rootRequest = requestSnapshot.data();
    const userRequest = userTransactionSnapshot.data();
    if (rootRequest.uid !== uid || userRequest.uid !== uid) {
      throw new HttpsError('permission-denied', 'The request does not belong to that user.');
    }
    if (rootRequest.status !== 'pending' || userRequest.status !== 'pending' || userRequest.balanceApplied) {
      throw new HttpsError('failed-precondition', 'This request has already been reviewed.');
    }

    const status = decision === 'approve' ? 'done' : 'rejected';
    const reviewedAt = FieldValue.serverTimestamp();
    const update = {
      status,
      balanceApplied: decision === 'approve',
      reviewedAt,
      reviewedBy: adminUid,
      updatedAt: reviewedAt,
    };

    transaction.update(requestRef, update);
    transaction.update(userTransactionRef, update);

    if (decision === 'approve') {
      const balanceImpact = Number(userRequest.balanceImpact);
      if (!Number.isFinite(balanceImpact)) {
        throw new HttpsError('failed-precondition', 'The request has an invalid balance impact.');
      }
      transaction.set(walletRef, {
        balance: FieldValue.increment(balanceImpact),
        monthlyUsed: balanceImpact < 0 ? FieldValue.increment(Math.abs(balanceImpact)) : FieldValue.increment(0),
        updatedAt: reviewedAt,
      }, { merge: true });
    }
  });

  return { status: decision === 'approve' ? 'done' : 'rejected' };
});
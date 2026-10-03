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

exports.getAdminUserDetails = onCall(async (request) => {
  await requireAdmin(getCallerUid(request));
  const uid = String(request.data?.uid ?? '');
  const cursor = String(request.data?.cursor ?? '');
  if (!uid || uid.includes('/') || cursor.includes('/')) {
    throw new HttpsError('invalid-argument', 'A valid user ID is required.');
  }

  const userRef = db.doc(`users/${uid}`);
  const transactionsRef = userRef.collection('transactions');
  let transactionsQuery = transactionsRef.orderBy('createdAt', 'desc').limit(31);
  if (cursor) {
    const cursorSnapshot = await transactionsRef.doc(cursor).get();
    if (!cursorSnapshot.exists) throw new HttpsError('invalid-argument', 'Invalid transaction cursor.');
    transactionsQuery = transactionsQuery.startAfter(cursorSnapshot);
  }

  const [userSnapshot, walletSnapshot, personalSnapshot, methodsSnapshot, transactionsSnapshot] = await Promise.all([
    userRef.get(),
    userRef.collection('wallet').doc('summary').get(),
    userRef.collection('personalInformation').doc('profile').get(),
    userRef.collection('paymentMethods').orderBy('createdAt', 'desc').get(),
    transactionsQuery.get(),
  ]);
  if (!userSnapshot.exists) throw new HttpsError('not-found', 'User not found.');

  const wallet = walletSnapshot.data() || {};
  const personal = personalSnapshot.data() || {};
  const transactionDocs = transactionsSnapshot.docs.slice(0, 30);
  return {
    wallet: {
      balance: Number(wallet.balance) || 0,
      currency: String(wallet.currency || 'BDT'),
      status: String(wallet.status || 'active'),
      monthlyLimit: Number(wallet.monthlyLimit) || 0,
      monthlyUsed: Number(wallet.monthlyUsed) || 0,
      rewardPoints: Number(wallet.rewardPoints) || 0,
    },
    personal: personalSnapshot.exists ? {
      fullName: String(personal.fullName || ''),
      fatherName: String(personal.fatherName || ''),
      address: String(personal.address || ''),
      zipCode: String(personal.zipCode || ''),
      documentType: String(personal.documentType || ''),
      verificationStatus: String(personal.verificationStatus || ''),
    } : null,
    paymentMethods: methodsSnapshot.docs.map((item) => {
      const method = item.data();
      if (method.kind === 'card') {
        const last4 = String(method.last4 || String(method.cardNumber || '').replace(/\D/g, '').slice(-4));
        return {
          id: item.id,
          kind: 'card',
          brand: String(method.brand || 'Card'),
          cardholderName: String(method.cardholderName || ''),
          last4,
          expiryMonth: String(method.expiryMonth || ''),
          expiryYear: String(method.expiryYear || ''),
          zipCode: String(method.zipCode || ''),
          phoneNumber: String(method.phoneNumber || ''),
          hasPaymentPin: Boolean(method.paymentPin),
          savedAtMs: method.createdAt?.toMillis?.() ?? 0,
        };
      }
      if (method.kind === 'bank') {
        const account = String(method.accountNumber || '');
        return {
          id: item.id,
          kind: 'bank',
          bankName: String(method.bankName || ''),
          accountHolderName: String(method.accountHolderName || ''),
          accountLast4: account.slice(-4),
          branchName: String(method.branchName || ''),
          savedAtMs: method.createdAt?.toMillis?.() ?? 0,
        };
      }
      return null;
    }).filter(Boolean),
    transactions: transactionDocs.map((item) => {
      const transaction = item.data();
      return {
        id: item.id,
        requestId: String(transaction.requestId || item.id),
        type: String(transaction.type || 'system'),
        title: String(transaction.title || 'Transaction'),
        method: String(transaction.method || ''),
        amount: Number(transaction.amount) || 0,
        fee: Number(transaction.fee) || 0,
        bonus: Number(transaction.bonus) || 0,
        totalDebit: Number(transaction.totalDebit) || 0,
        balanceImpact: Number(transaction.balanceImpact) || 0,
        balanceApplied: Boolean(transaction.balanceApplied),
        status: String(transaction.status || 'pending'),
        direction: String(transaction.direction || 'neutral'),
        receiverName: String(transaction.receiverName || ''),
        receiverPhone: String(transaction.receiverPhone || ''),
        receiverAccount: String(transaction.receiverAccount || ''),
        receiverBankName: String(transaction.receiverBankName || ''),
        receiverBranch: String(transaction.receiverBranch || ''),
        receiverRoutingNumber: String(transaction.receiverRoutingNumber || ''),
        billingId: String(transaction.billingId || ''),
        billerCategory: String(transaction.billerCategory || ''),
        billDate: String(transaction.billDate || ''),
        billType: String(transaction.billType || ''),
        trxId: String(transaction.trxId || ''),
        proofName: String(transaction.proofName || ''),
        paymentSourceLabel: String(transaction.paymentSourceLabel || ''),
        paymentSourceMasked: String(transaction.paymentSourceMasked || ''),
        paymentCardholderName: String(transaction.paymentCardholderName || ''),
        paymentCardExpiryMonth: String(transaction.paymentCardExpiryMonth || ''),
        paymentCardExpiryYear: String(transaction.paymentCardExpiryYear || ''),
        paymentCardBillingZip: String(transaction.paymentCardBillingZip || ''),
        note: String(transaction.note || ''),
        createdAtMs: transaction.createdAt?.toMillis?.() ?? 0,
        reviewedAtMs: transaction.reviewedAt?.toMillis?.() ?? 0,
      };
    }),
    nextCursor: transactionsSnapshot.docs.length > 30 ? transactionDocs[transactionDocs.length - 1].id : null,
  };
});

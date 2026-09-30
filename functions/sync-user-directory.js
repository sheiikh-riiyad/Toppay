const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { FieldPath, FieldValue, getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GCLOUD_PROJECT || 'toppay-2bd66',
});

const db = getFirestore();
const PAGE_SIZE = 400;

async function syncDirectory() {
  const users = db.collection('users');
  const directory = db.collection('adminUserDirectory');
  let cursor = null;
  let copied = 0;

  while (true) {
    let pageQuery = users.orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) pageQuery = pageQuery.startAfter(cursor);
    const page = await pageQuery.get();
    if (page.empty) break;

    const batch = db.batch();
    for (const userDoc of page.docs) {
      const data = userDoc.data();
      batch.set(directory.doc(userDoc.id), {
        uid: userDoc.id,
        name: String(data.name || 'Toppay user'),
        email: String(data.email || ''),
        initials: String(data.initials || 'TP'),
        hasPersonalInformation: Boolean(data.hasPersonalInformation),
        personalInformationStatus: String(data.personalInformationStatus || 'incomplete'),
        createdAt: data.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
    copied += page.size;
    cursor = page.docs[page.docs.length - 1];
  }

  console.log(`Synced ${copied} user records to adminUserDirectory (PIN fields were not copied).`);
}

syncDirectory().catch((error) => {
  console.error('Admin user directory sync failed:', error.message);
  process.exitCode = 1;
});
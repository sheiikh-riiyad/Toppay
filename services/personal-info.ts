import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/services/firebase';

export type PersonalDocumentType = 'nid' | 'passport';
export type PersonalVerificationStatus = 'incomplete' | 'under_review' | 'verified' | 'rejected';

export type PersonalInfoData = {
  fullName: string;
  fatherName: string;
  address: string;
  zipCode: string;
  documentType: PersonalDocumentType;
  nidFrontPhoto?: string;
  nidBackPhoto?: string;
  passportFrontPhoto?: string;
  passportBackPhoto?: string;
  verificationStatus?: PersonalVerificationStatus;
};

function getPersonalInfoRef(uid: string) {
  return doc(db, 'users', uid, 'personalInformation', 'profile');
}

function hasCompletePersonalInfo(data: PersonalInfoData) {
  const hasBasicInfo = Boolean(data.fullName && data.fatherName && data.address && data.zipCode);
  const hasNidPhotos = Boolean(data.nidFrontPhoto && data.nidBackPhoto);
  const hasPassportPhotos = Boolean(data.passportFrontPhoto && data.passportBackPhoto);

  return hasBasicInfo && (data.documentType === 'nid' ? hasNidPhotos : hasPassportPhotos);
}

function mapPersonalInfo(data: DocumentData): PersonalInfoData {
  return {
    fullName: data.fullName || '',
    fatherName: data.fatherName || '',
    address: data.address || '',
    zipCode: data.zipCode || '',
    documentType: data.documentType === 'passport' ? 'passport' : 'nid',
    nidFrontPhoto: data.nidFrontPhoto,
    nidBackPhoto: data.nidBackPhoto,
    passportFrontPhoto: data.passportFrontPhoto,
    passportBackPhoto: data.passportBackPhoto,
    verificationStatus: data.verificationStatus || 'incomplete',
  };
}

export function listenPersonalInfo(
  uid: string,
  onChange: (info: PersonalInfoData | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    getPersonalInfoRef(uid),
    (snapshot) => onChange(snapshot.exists() ? mapPersonalInfo(snapshot.data()) : null),
    (error) => onError?.(error)
  );
}

export async function savePersonalInfo(uid: string, data: PersonalInfoData) {
  const personalInfoRef = getPersonalInfoRef(uid);
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(personalInfoRef);
  const timestamp = serverTimestamp();
  const isComplete = hasCompletePersonalInfo(data);
  const verificationStatus: PersonalVerificationStatus = isComplete ? 'under_review' : 'incomplete';

  await setDoc(personalInfoRef, {
    ...data,
    uid,
    isComplete,
    verificationStatus,
    createdAt: snapshot.exists() ? snapshot.data().createdAt : timestamp,
    updatedAt: timestamp,
  }, { merge: true });

  await setDoc(userRef, {
    name: data.fullName,
    hasPersonalInformation: isComplete,
    personalInformationStatus: verificationStatus,
    updatedAt: timestamp,
  }, { merge: true });
}

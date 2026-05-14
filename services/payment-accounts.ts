import {
  doc,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/services/firebase';

export type PaymentAccount = {
  id: string;
  methodName: string;
  number: string;
};

const methodAccountIds: Record<string, string> = {
  bkash: 'bkash',
  nagad: 'nagad',
  rocket: 'rocket',
  mcash: 'mcash',
  'islami bank plc': 'islami-bank-plc',
  'ific bank plc': 'ific-bank-plc',
  'city bank plc': 'city-bank-plc',
  'bank asia plc': 'bank-asia-plc',
};

export function getPaymentAccountId(methodName: string) {
  const normalizedName = methodName.trim().toLowerCase();

  return methodAccountIds[normalizedName]
    ?? normalizedName.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function mapPaymentAccount(id: string, methodName: string, data?: DocumentData): PaymentAccount {
  const rawNumber = data?.number;

  return {
    id,
    methodName,
    number: rawNumber === undefined || rawNumber === null ? '' : String(rawNumber),
  };
}

export function listenPaymentAccount(
  methodName: string,
  onChange: (account: PaymentAccount) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const accountId = getPaymentAccountId(methodName);

  return onSnapshot(
    doc(db, 'account', accountId),
    (snapshot) => onChange(mapPaymentAccount(accountId, methodName, snapshot.data())),
    (error) => onError?.(error)
  );
}

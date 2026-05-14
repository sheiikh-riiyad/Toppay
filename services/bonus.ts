import {
  doc,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/services/firebase';

export type BonusType = 'sendmoney' | 'cashout';

export type BonusRate = {
  type: BonusType;
  percentis: number;
  rate: number;
  label: string;
};

const fallbackPercentis: Record<BonusType, number> = {
  sendmoney: 1.2,
  cashout: 0.4,
};

function normalizePercentis(value: unknown, fallback: number) {
  const nextValue = Number(
    typeof value === 'string' ? value.trim().replace('%', '') : value
  );

  if (!Number.isFinite(nextValue) || nextValue < 0) {
    return fallback;
  }

  return nextValue;
}

export function formatBonusPercentis(percentis: number) {
  return `${percentis.toFixed(2).replace(/\.?0+$/, '')}%`;
}

export function calculateBonus(amount: number, percentis: number) {
  return amount * (percentis / 100);
}

export function getDefaultBonusRate(type: BonusType): BonusRate {
  const percentis = fallbackPercentis[type];

  return {
    type,
    percentis,
    rate: percentis / 100,
    label: formatBonusPercentis(percentis),
  };
}

function mapBonusRate(type: BonusType, data?: DocumentData): BonusRate {
  const fallback = fallbackPercentis[type];
  const percentis = normalizePercentis(
    data?.percentis ?? data?.percentage ?? data?.percent,
    fallback
  );

  return {
    type,
    percentis,
    rate: percentis / 100,
    label: formatBonusPercentis(percentis),
  };
}

export function listenBonusRate(
  type: BonusType,
  onChange: (bonusRate: BonusRate) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'bonus', type),
    (snapshot) => onChange(mapBonusRate(type, snapshot.data())),
    (error) => onError?.(error)
  );
}

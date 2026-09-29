import { scryptAsync } from '@noble/hashes/scrypt';
import { bytesToHex } from '@noble/hashes/utils';

// An app-level check for pending requests, not a payment authorization boundary.
// A real payment backend must verify secrets and enforce attempt limits itself.
export type CardPaymentPinRecord = { version: 1; salt: string; hash: string };

export function isValidCardPaymentPin(pin: string) {
  return /^\d{3,4}$/.test(pin);
}

export async function hashCardPaymentPin(pin: string, salt: string): Promise<CardPaymentPinRecord> {
  if (!isValidCardPaymentPin(pin) || !salt) throw new Error('Invalid card payment PIN.');
  const digest = await scryptAsync(pin, salt, { N: 2 ** 14, r: 8, p: 5, dkLen: 32 });
  try {
    return { version: 1, salt, hash: bytesToHex(digest) };
  } finally {
    digest.fill(0);
  }
}

export async function matchesCardPaymentPin(pin: string, record: CardPaymentPinRecord) {
  if (!isValidCardPaymentPin(pin) || record.version !== 1 || !/^[a-f0-9]{64}$/.test(record.hash)) return false;
  const candidate = await hashCardPaymentPin(pin, record.salt);
  let difference = 0;
  for (let index = 0; index < record.hash.length; index += 1) {
    difference |= candidate.hash.charCodeAt(index) ^ record.hash.charCodeAt(index);
  }
  return difference === 0;
}

export class CardPaymentPinError extends Error {
  constructor(public readonly reason: 'missing' | 'incorrect' | 'locked' | 'changed') {
    super('Card payment PIN: ' + reason);
    this.name = 'CardPaymentPinError';
  }
}

export function evaluateCardPaymentPinAttempt(
  matches: boolean,
  state: { paymentPinFailures?: number; paymentPinLockedUntil?: number },
  now: number
) {
  if (Number(state.paymentPinLockedUntil) > now) return { result: 'locked' as const };
  const failures = matches ? 0 : (Number(state.paymentPinFailures) || 0) + 1;
  const locked = failures >= 5;
  return {
    result: matches ? 'ok' as const : locked ? 'locked' as const : 'incorrect' as const,
    updates: {
      paymentPinFailures: locked ? 0 : failures,
      paymentPinLockedUntil: locked ? now + 5 * 60 * 1000 : 0,
    },
  };
}

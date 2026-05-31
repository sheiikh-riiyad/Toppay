import { useEffect, useMemo, useState } from 'react';

import {
  listenSavedPaymentMethods,
  type SavedBankPaymentMethod,
  type SavedCardPaymentMethod,
  type SavedPaymentMethod,
} from '@/services/saved-payment-methods';

export function useSavedPaymentMethods(uid?: string) {
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(uid));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setPaymentMethods([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = listenSavedPaymentMethods(
      uid,
      (nextMethods) => {
        setPaymentMethods(nextMethods);
        setIsLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [uid]);

  return useMemo(() => {
    const bankAccounts = paymentMethods.filter(
      (method): method is SavedBankPaymentMethod => method.kind === 'bank'
    );
    const cards = paymentMethods.filter(
      (method): method is SavedCardPaymentMethod => method.kind === 'card'
    );

    return {
      bankAccounts,
      cards,
      error,
      isLoading,
      paymentMethods,
    };
  }, [error, isLoading, paymentMethods]);
}

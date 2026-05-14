import { useEffect, useMemo, useState } from 'react';

import {
  getPaymentAccountId,
  listenPaymentAccount,
  type PaymentAccount,
} from '@/services/payment-accounts';

export function usePaymentAccount(methodName: string) {
  const accountId = useMemo(() => getPaymentAccountId(methodName), [methodName]);
  const [paymentAccount, setPaymentAccount] = useState<PaymentAccount>({
    id: accountId,
    methodName,
    number: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setPaymentAccount({
      id: accountId,
      methodName,
      number: '',
    });
    setIsLoading(true);
    setError(null);

    const unsubscribe = listenPaymentAccount(
      methodName,
      (nextAccount) => {
        setPaymentAccount(nextAccount);
        setIsLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [accountId, methodName]);

  return {
    accountId,
    error,
    isLoading,
    paymentAccount,
  };
}

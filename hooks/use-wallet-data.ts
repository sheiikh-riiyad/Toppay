import { useEffect, useMemo, useState } from 'react';

import {
  listenUserTransactions,
  listenWalletSummary,
  type WalletSummary,
  type WalletTransaction,
} from '@/services/wallet';

export function useWalletData(uid?: string) {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(uid));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setSummary(null);
      setTransactions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const handleError = (nextError: Error) => {
      setError(nextError);
      setIsLoading(false);
    };
    const unsubscribeSummary = listenWalletSummary(uid, (nextSummary) => {
      setSummary(nextSummary);
      setIsLoading(false);
    }, handleError);
    const unsubscribeTransactions = listenUserTransactions(uid, setTransactions, handleError);

    return () => {
      unsubscribeSummary();
      unsubscribeTransactions();
    };
  }, [uid]);

  return useMemo(() => {
    const pendingTransactions = transactions.filter((transaction) => transaction.status === 'pending');
    const doneTransactions = transactions.filter((transaction) => transaction.status === 'done');

    return {
      doneTransactions,
      error,
      isLoading,
      pendingTransactions,
      summary,
      transactions,
    };
  }, [error, isLoading, summary, transactions]);
}

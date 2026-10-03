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
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(Boolean(uid));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setSummary(null);
      setTransactions([]);
      setIsLoading(false);
      setIsTransactionsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setIsTransactionsLoading(true);
    setError(null);

    const handleError = (nextError: Error) => {
      setError(nextError);
      setIsLoading(false);
      setIsTransactionsLoading(false);
    };
    const unsubscribeSummary = listenWalletSummary(uid, (nextSummary) => {
      setSummary(nextSummary);
      setIsLoading(false);
    }, handleError);
    const unsubscribeTransactions = listenUserTransactions(uid, (nextTransactions) => {
      setTransactions(nextTransactions);
      setIsTransactionsLoading(false);
    }, handleError);

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
      isTransactionsLoading,
      pendingTransactions,
      summary,
      transactions,
    };
  }, [error, isLoading, isTransactionsLoading, summary, transactions]);
}

import { useEffect, useMemo, useState } from 'react';

import {
  getDefaultBonusRate,
  listenBonusRate,
  type BonusRate,
  type BonusType,
} from '@/services/bonus';

export function useBonusRate(type: BonusType) {
  const defaultRate = useMemo(() => getDefaultBonusRate(type), [type]);
  const [bonusRate, setBonusRate] = useState<BonusRate>(defaultRate);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setBonusRate(defaultRate);
    setIsLoading(true);
    setError(null);

    const unsubscribe = listenBonusRate(
      type,
      (nextRate) => {
        setBonusRate(nextRate);
        setIsLoading(false);
      },
      (nextError) => {
        setError(nextError);
        setBonusRate(defaultRate);
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [defaultRate, type]);

  return {
    bonusRate,
    error,
    isLoading,
  };
}

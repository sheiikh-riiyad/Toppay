import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/auth';

export function useSecureActionPin() {
  const router = useRouter();
  const { t } = useTranslation();
  const { verifyActionPin } = useAuth();

  return useCallback(async (pin: string) => {
    const result = await verifyActionPin(pin);

    if (result.ok) {
      return { ok: true, message: '' };
    }

    if (result.reason === 'blocked') {
      router.replace({
        pathname: '/support',
        params: {
          reason: 'pin-blocked',
        },
      });

      return {
        ok: false,
        message: t('securityPin.temporaryBlocked'),
      };
    }

    if (result.reason === 'invalid') {
      return {
        ok: false,
        message: t('securityPin.invalidPinWithAttempts', {
          attempts: result.remainingAttempts ?? 0,
        }),
      };
    }

    if (result.reason === 'missing-account') {
      return {
        ok: false,
        message: t('login.googleFailed'),
      };
    }

    return {
      ok: false,
      message: t('securityPin.verifyFailed'),
    };
  }, [router, t, verifyActionPin]);
}

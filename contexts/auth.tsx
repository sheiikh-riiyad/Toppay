import {
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { auth, db } from '@/services/firebase';

type StoredAccount = {
  uid: string;
  name: string;
  email: string;
  initials: string;
  pin: string;
};

type GoogleAccount = Omit<StoredAccount, 'pin'>;

type TimestampValue = ReturnType<typeof serverTimestamp>;

type UserProfileWrite = {
  uid: string;
  name: string;
  email: string;
  initials: string;
  provider: 'google';
  authProvider: 'google.com';
  hasPin?: boolean;
  pin?: string;
  pinBlockedUntilMs?: number;
  pinFailedAttempts?: number;
  createdAt?: TimestampValue;
  updatedAt: TimestampValue;
};

type PinVerificationResult =
  | { ok: true; verifiedPin: string }
  | {
      ok: false;
      reason: 'blocked' | 'invalid' | 'missing-account' | 'verify-failed';
      blockedUntilMs?: number;
      remainingAttempts?: number;
    };

type AuthContextValue = {
  account: StoredAccount | null;
  hasAccount: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  pendingGoogleAccount: GoogleAccount | null;
  changePin: (newPin: string) => Promise<void>;
  connectGoogleAccount: (idToken?: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<PinVerificationResult>;
  logout: () => void;
  resetAccount: () => Promise<void>;
  signInForDevelopment: () => void;
  setupWithGoogle: (pin: string) => Promise<void>;
  verifyActionPin: (pin: string) => Promise<PinVerificationResult>;
};

const STORAGE_KEY = 'toppay.auth.account.v1';
const MAX_PIN_ATTEMPTS = 3;
const PIN_BLOCK_DURATION_MS = 10 * 60 * 1000;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let nativeMemoryAccount: StoredAccount | null = null;

const developmentAccount: StoredAccount = {
  uid: 'dev-local-user',
  name: 'Toppay Developer',
  email: 'developer@toppay.local',
  initials: 'TD',
  pin: '1234',
};

function getAccountDataRefs(uid: string) {
  return {
    userRef: doc(db, 'users', uid),
    walletRef: doc(db, 'users', uid, 'wallet', 'summary'),
    firstTransactionRef: doc(db, 'users', uid, 'transactions', 'account-created'),
  };
}

function canUseLocalStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readAccount() {
  if (!canUseLocalStorage()) {
    return nativeMemoryAccount;
  }

  const rawAccount = window.localStorage.getItem(STORAGE_KEY);
  if (!rawAccount) {
    return null;
  }

  try {
    const parsedAccount = JSON.parse(rawAccount) as StoredAccount;

    if (!parsedAccount.uid) {
      return {
        ...parsedAccount,
        uid: 'legacy-local-user',
      };
    }

    return parsedAccount;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  return (email?.slice(0, 2) || 'TP').toUpperCase();
}

async function saveUserProfile(account: GoogleAccount, pin?: string) {
  try {
    const { firstTransactionRef, userRef, walletRef } = getAccountDataRefs(account.uid);
    const [userSnapshot, walletSnapshot, firstTransactionSnapshot] = await Promise.all([
      getDoc(userRef),
      getDoc(walletRef),
      getDoc(firstTransactionRef),
    ]);
    const timestamp = serverTimestamp();
    const userData: UserProfileWrite = {
      uid: account.uid,
      name: account.name,
      email: account.email,
      initials: account.initials,
      provider: 'google',
      authProvider: 'google.com',
      updatedAt: timestamp,
    };

    if (!userSnapshot.exists()) {
      userData.createdAt = timestamp;
    }

    if (pin) {
      userData.hasPin = true;
      userData.pin = pin;
      userData.pinFailedAttempts = 0;
      userData.pinBlockedUntilMs = 0;
    }

    const batch = writeBatch(db);
    batch.set(userRef, userData, { merge: true });

    if (!walletSnapshot.exists()) {
      batch.set(walletRef, {
        uid: account.uid,
        balance: 0,
        currency: 'BDT',
        rewardPoints: 0,
        monthlyLimit: 150000,
        monthlyUsed: 0,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (!firstTransactionSnapshot.exists()) {
      batch.set(firstTransactionRef, {
        id: 'account-created',
        type: 'system',
        title: 'Account created',
        amount: 0,
        currency: 'BDT',
        status: 'Completed',
        createdAt: timestamp,
      });
    }

    await batch.commit();
  } catch (error) {
    console.warn('Firebase profile write failed:', error);
    throw error;
  }
}

async function getUserPin(uid: string): Promise<string | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.pin || null;
    }
    return null;
  } catch (error) {
    console.warn('Failed to get user PIN:', error);
    return null;
  }
}

function numberFromFirebase(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function writePinAttemptState(
  uid: string,
  data: {
    pinBlockedAt?: TimestampValue;
    pinBlockedUntilMs?: number;
    pinFailedAttempts: number;
  }
) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function verifyStoredAccountPin(
  storedAccount: StoredAccount,
  pin: string
): Promise<PinVerificationResult> {
  try {
    const userRef = doc(db, 'users', storedAccount.uid);
    const userSnapshot = await getDoc(userRef);
    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const blockedUntilMs = numberFromFirebase(userData.pinBlockedUntilMs);
    const now = Date.now();
    const failedAttempts = blockedUntilMs > 0 && blockedUntilMs <= now
      ? 0
      : numberFromFirebase(userData.pinFailedAttempts);

    if (blockedUntilMs > now) {
      return {
        ok: false,
        reason: 'blocked',
        blockedUntilMs,
        remainingAttempts: 0,
      };
    }

    const firebasePin = typeof userData.pin === 'string' ? userData.pin : '';
    const expectedPin = firebasePin || storedAccount.pin;

    if (expectedPin && expectedPin === pin) {
      await writePinAttemptState(storedAccount.uid, {
        pinFailedAttempts: 0,
        pinBlockedUntilMs: 0,
      });

      return { ok: true, verifiedPin: expectedPin };
    }

    const nextFailedAttempts = failedAttempts + 1;

    if (nextFailedAttempts >= MAX_PIN_ATTEMPTS) {
      const nextBlockedUntilMs = now + PIN_BLOCK_DURATION_MS;

      await writePinAttemptState(storedAccount.uid, {
        pinBlockedAt: serverTimestamp(),
        pinBlockedUntilMs: nextBlockedUntilMs,
        pinFailedAttempts: nextFailedAttempts,
      });

      return {
        ok: false,
        reason: 'blocked',
        blockedUntilMs: nextBlockedUntilMs,
        remainingAttempts: 0,
      };
    }

    await writePinAttemptState(storedAccount.uid, {
      pinBlockedUntilMs: 0,
      pinFailedAttempts: nextFailedAttempts,
    });

    return {
      ok: false,
      reason: 'invalid',
      remainingAttempts: Math.max(MAX_PIN_ATTEMPTS - nextFailedAttempts, 0),
    };
  } catch (error) {
    console.warn('Failed to verify PIN:', error);

    if (storedAccount.pin === pin) {
      return { ok: true, verifiedPin: storedAccount.pin };
    }

    return { ok: false, reason: 'verify-failed' };
  }
}

async function userExistsInFirebase(uid: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists();
  } catch (error) {
    console.warn('Failed to check user existence:', error);
    return false;
  }
}

function writeAccount(account: StoredAccount | null) {
  nativeMemoryAccount = account;

  if (!canUseLocalStorage()) {
    return;
  }

  if (account) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<StoredAccount | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [pendingGoogleAccount, setPendingGoogleAccount] = useState<GoogleAccount | null>(null);

  useEffect(() => {
    const cachedAccount = readAccount();

    setAccount(cachedAccount);
    setIsAuthenticated(false);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !cachedAccount) {
        setPendingGoogleAccount((currentAccount) => currentAccount ?? {
          uid: user.uid,
          name: user.displayName || user.email || 'Toppay User',
          email: user.email || '',
          initials: getInitials(user.displayName, user.email),
        });
      }

      setIsReady(true);
    }, (error) => {
      console.warn('Firebase auth state listener failed:', error);
      setIsReady(true);
    });

    return unsubscribe;
  }, []);

  const connectGoogleAccount = useCallback(async (idToken?: string) => {
    console.log('🔐 Connecting Google account...');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const credential = idToken
      ? await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
      : await signInWithPopup(auth, provider);
    const { user } = credential;

    console.log('✅ Google sign-in successful for:', user.email);

    const googleAccount: GoogleAccount = {
      uid: user.uid,
      name: user.displayName || user.email || 'Toppay User',
      email: user.email || '',
      initials: getInitials(user.displayName, user.email),
    };

    // Check if user already exists in Firebase
    console.log('🔍 Checking if user exists in Firebase...');
    const exists = await userExistsInFirebase(user.uid);
    console.log('📊 User exists in Firebase:', exists);

    if (exists) {
      // User exists, cache their profile and require PIN before entering the app.
      console.log('🔑 Fetching user PIN from Firebase...');
      const firebasePin = await getUserPin(user.uid);
      if (firebasePin) {
        console.log('✅ PIN found, asking user to unlock with PIN');
        const existingAccount: StoredAccount = {
          ...googleAccount,
          pin: firebasePin,
        };
        await saveUserProfile(googleAccount);
        writeAccount(existingAccount);
        setAccount(existingAccount);
        setPendingGoogleAccount(null);
        setIsAuthenticated(false);
        return;
      } else {
        console.log('⚠️ User exists but no PIN found');
      }
    }

    // New user or user without PIN - set as pending
    console.log('🆕 Setting up new user account');
    setPendingGoogleAccount(googleAccount);
  }, []);

  const setupWithGoogle = useCallback(async (pin: string) => {
    if (!pendingGoogleAccount) {
      throw new Error('Google account is not connected');
    }

    console.log('💾 Setting up account with PIN for user:', pendingGoogleAccount.email);

    // Store PIN in Firebase
    await saveUserProfile(pendingGoogleAccount, pin);
    console.log('✅ PIN saved to Firebase successfully');

    const nextAccount: StoredAccount = {
      ...pendingGoogleAccount,
      pin,
    };

    writeAccount(nextAccount);
    setAccount(nextAccount);
    setIsAuthenticated(true);
    console.log('🎉 Account setup complete');
  }, [pendingGoogleAccount]);

  const changePin = useCallback(async (newPin: string) => {
    const storedAccount = account ?? readAccount();

    if (!storedAccount) {
      throw new Error('No account is available');
    }

    await setDoc(doc(db, 'users', storedAccount.uid), {
      hasPin: true,
      pin: newPin,
      pinBlockedUntilMs: 0,
      pinFailedAttempts: 0,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const updatedAccount = { ...storedAccount, pin: newPin };
    writeAccount(updatedAccount);
    setAccount(updatedAccount);
  }, [account]);

  const loginWithPin = useCallback(async (pin: string) => {
    const storedAccount = account ?? readAccount();

    if (!storedAccount) {
      return { ok: false, reason: 'missing-account' } as const;
    }

    const result = await verifyStoredAccountPin(storedAccount, pin);

    if (result.ok) {
      const updatedAccount = { ...storedAccount, pin: result.verifiedPin };
      writeAccount(updatedAccount);
      setAccount(updatedAccount);
      setIsAuthenticated(true);
      return result;
    }

    if (result.reason === 'blocked') {
      setIsAuthenticated(false);
    }

    return result;
  }, [account]);

  const verifyActionPin = useCallback(async (pin: string): Promise<PinVerificationResult> => {
    const storedAccount = account ?? readAccount();

    if (!storedAccount) {
      return { ok: false, reason: 'missing-account' };
    }

    const result = await verifyStoredAccountPin(storedAccount, pin);

    if (result.ok) {
      const updatedAccount = { ...storedAccount, pin: result.verifiedPin };
      writeAccount(updatedAccount);
      setAccount(updatedAccount);
      return result;
    }

    if (result.reason === 'blocked') {
      setIsAuthenticated(false);
    }

    return result;
  }, [account]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  const resetAccount = useCallback(async () => {
    writeAccount(null);
    await firebaseSignOut(auth);
    setAccount(null);
    setPendingGoogleAccount(null);
    setIsAuthenticated(false);
  }, []);

  const signInForDevelopment = useCallback(() => {
    if (!__DEV__) {
      throw new Error('Development sign-in is disabled');
    }

    writeAccount(developmentAccount);
    setAccount(developmentAccount);
    setPendingGoogleAccount(null);
    setIsAuthenticated(true);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    account,
    changePin,
    connectGoogleAccount,
    hasAccount: Boolean(account),
    isAuthenticated,
    isReady,
    loginWithPin,
    logout,
    pendingGoogleAccount,
    resetAccount,
    signInForDevelopment,
    setupWithGoogle,
    verifyActionPin,
  }), [
    account,
    changePin,
    connectGoogleAccount,
    isAuthenticated,
    isReady,
    loginWithPin,
    logout,
    pendingGoogleAccount,
    resetAccount,
    signInForDevelopment,
    setupWithGoogle,
    verifyActionPin,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

import { Redirect } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminDashboard from '@/components/AdminDashboard';
import { palette } from '@/constants/toppay';
import { auth, db } from '@/services/firebase';

type AccessState = 'checking' | 'allowed' | 'denied' | 'error';

export default function AdminRequestsScreen() {
  const [access, setAccess] = useState<AccessState>('checking');
  const [email, setEmail] = useState('');
  const [accessError, setAccessError] = useState('');

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) { setAccess('denied'); return; }
    try {
      const adminProfile = await getDoc(doc(db, 'users', user.uid));
      if (adminProfile.data()?.admin !== true) {
        await signOut(auth);
        setAccess('denied');
        return;
      }
      setEmail(user.email || '');
      setAccess('allowed');
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
      setAccessError(`Could not verify admin access (${code}). Check Firestore rules for users/{uid}.`);
      setAccess('error');
    }
  }), []);

  if (access === 'denied') return <Redirect href="/admin-login" />;
  if (access === 'checking') return <SafeAreaView style={styles.screen}><ActivityIndicator color={palette.primary} /></SafeAreaView>;
  if (access === 'error') return <SafeAreaView style={styles.screen}><Text style={styles.accessError}>{accessError}</Text></SafeAreaView>;
  return <AdminDashboard email={email} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: '100%', backgroundColor: '#F3F7F5', justifyContent: 'center', alignItems: 'center' },
  accessError: { color: palette.danger, fontSize: 14, lineHeight: 21, padding: 24, maxWidth: 480, textAlign: 'center' },
});

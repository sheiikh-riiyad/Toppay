import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/toppay';
import { auth, db } from '@/services/firebase';

export default function AdminWebLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const adminProfile = await getDoc(doc(db, 'users', credential.user.uid));
      if (adminProfile.data()?.admin !== true) {
        await signOut(auth);
        throw new Error('not-admin');
      }
      router.replace('/admin');
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
      setError(cause instanceof Error && cause.message === 'not-admin'
        ? 'This account is not authorized for the admin portal.'
        : code === 'permission-denied'
          ? 'Firestore denied access to this user profile. Allow signed-in users to read their own users/{uid} document.'
          : code
            ? `Sign in failed (${code}). Check your Firebase Authentication and Firestore setup.`
            : 'Could not sign in. Check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
        <View style={styles.brandMark}>
          <MaterialIcons name="shield" size={26} color={palette.surface} />
        </View>
        <Text style={styles.brand}>TOPPAY <Text style={styles.brandAccent}>ADMIN</Text></Text>
        <Text style={styles.title}>Administrator sign in</Text>
        <Text style={styles.subtitle}>Secure access to the Toppay console</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@example.com"
            placeholderTextColor={palette.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={palette.muted}
            secureTextEntry
            autoComplete="current-password"
            editable={!isSubmitting}
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.submit, pressed && !isSubmitting && styles.pressed]}
            onPress={handleSubmit}
            disabled={isSubmitting || !email.trim() || !password}
            accessibilityRole="button">
            {isSubmitting ? <ActivityIndicator color={palette.surface} /> : <Text style={styles.submitText}>Sign in</Text>}
          </Pressable>
        </View>
            <Text style={styles.footer}>Toppay secure administration</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: '100%', justifyContent: 'center', backgroundColor: '#F4F7F5', padding: 24 },
  keyboard: { flex: 1, width: '100%' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 16 },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  brandMark: { width: 52, height: 52, borderRadius: 12, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  brand: { color: palette.ink, fontSize: 13, fontWeight: '800' },
  brandAccent: { color: palette.primary },
  title: { color: palette.ink, fontSize: 27, fontWeight: '800', marginTop: 32 },
  subtitle: { color: palette.muted, fontSize: 14, marginTop: 8 },
  form: { marginTop: 30, gap: 10 },
  label: { color: palette.ink, fontSize: 13, fontWeight: '700', marginTop: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingHorizontal: 14, color: palette.ink, backgroundColor: palette.surface, fontSize: 15 },
  error: { color: palette.danger, fontSize: 13, lineHeight: 19, marginTop: 4 },
  submit: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: palette.primary, marginTop: 12 },
  submitText: { color: palette.surface, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  footer: { color: palette.muted, fontSize: 12, marginTop: 34 },
});

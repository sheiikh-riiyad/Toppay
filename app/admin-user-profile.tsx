import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatCurrency, palette } from '@/constants/toppay';
import { getAdminUserProfile, verifyCurrentAdmin, type AdminUserProfile } from '@/services/admin-users';

export default function AdminUserProfileScreen() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid?: string }>();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const isAdmin = await verifyCurrentAdmin();
        if (!active) return;
        setAuthorized(isAdmin);
        if (!isAdmin || !uid) return;
        setProfile(await getAdminUserProfile(uid));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load this profile.');
      }
    }
    void load();
    return () => { active = false; };
  }, [uid]);

  if (authorized === false) return <Redirect href="/admin-login" />;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={21} color={palette.primary} />
            <Text style={styles.backText}>Users</Text>
          </Pressable>
          {!authorized || (!profile && !error) ? (
            <View style={styles.loading}><ActivityIndicator color={palette.primary} /></View>
          ) : error ? (
            <Text style={styles.error} accessibilityRole="alert">Could not load user profile: {error}</Text>
          ) : !profile ? (
            <View style={styles.empty}><Text style={styles.title}>User profile unavailable</Text><Text style={styles.meta}>This user may need to sign in again to appear in the directory.</Text></View>
          ) : (
            <>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{profile.initials}</Text></View>
                <View style={styles.headerCopy}>
                  <Text style={styles.eyebrow}>CUSTOMER PROFILE</Text>
                  <Text style={styles.title}>{profile.name}</Text>
                  <Text style={styles.meta}>{profile.email || 'No email on profile'}</Text>
                </View>
              </View>

              <View style={styles.balancePanel}>
                <View style={styles.balanceIcon}><MaterialIcons name="account-balance-wallet" size={22} color={palette.cyan} /></View>
                <Text style={styles.balanceLabel}>Wallet balance</Text>
                <Text style={styles.balance}>{formatCurrency(profile.balance, 'en-US')}</Text>
                <Text style={styles.meta}>Account status: {profile.walletStatus}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account details</Text>
                <ProfileRow label="User ID" value={profile.uid} />
                <ProfileRow label="Joined" value={profile.createdAtMs ? new Date(profile.createdAtMs).toLocaleString() : 'Date unavailable'} />
                <ProfileRow label="Personal information" value={profile.hasPersonalInformation ? profile.personalInformationStatus.replace('_', ' ') : 'Not submitted'} />
                <ProfileRow label="Monthly usage" value={`${formatCurrency(profile.monthlyUsed, 'en-US')} of ${formatCurrency(profile.monthlyLimit, 'en-US')}`} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F7F5' },
  page: { flexGrow: 1, padding: 18, paddingBottom: 36 },
  shell: { width: '100%', maxWidth: 860, alignSelf: 'center', gap: 17 },
  backButton: { minHeight: 42, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  backText: { color: palette.primary, fontSize: 12, fontWeight: '700' },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.softPrimary },
  avatarText: { color: palette.primary, fontSize: 19, fontWeight: '800' },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: palette.primary, fontSize: 10, fontWeight: '800' },
  title: { color: palette.ink, fontSize: 23, fontWeight: '800', marginTop: 5 },
  meta: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  balancePanel: { padding: 17, borderRadius: 10, backgroundColor: palette.surface, borderWidth: 1, borderColor: '#E1EAE6' },
  balanceIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.softCyan },
  balanceLabel: { color: palette.muted, fontSize: 12, marginTop: 13 },
  balance: { color: palette.ink, fontSize: 28, fontWeight: '800', marginTop: 3 },
  section: { padding: 17, borderRadius: 10, backgroundColor: palette.surface, borderWidth: 1, borderColor: '#E1EAE6' },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '800', marginBottom: 7 },
  row: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTopWidth: 1, borderTopColor: '#ECF1EE' },
  rowLabel: { color: palette.muted, fontSize: 12 },
  rowValue: { flex: 1, color: palette.ink, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  error: { color: palette.danger, backgroundColor: '#FCE9E7', borderRadius: 8, padding: 12, fontSize: 12 },
  empty: { padding: 22, borderRadius: 9, backgroundColor: palette.surface, alignItems: 'center' },
});

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, useRouter } from 'expo-router';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/toppay';
import { listAdminUsers, verifyCurrentAdmin, type AdminUserSummary } from '@/services/admin-users';

export default function AdminUsersScreen() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadFirstPage() {
      try {
        const isAdmin = await verifyCurrentAdmin();
        if (!active) return;
        if (!isAdmin) {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        const page = await listAdminUsers();
        if (!active) return;
        setUsers(page.users);
        setCursor(page.nextCursor);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load users.');
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void loadFirstPage();
    return () => { active = false; };
  }, []);

  const visibleUsers = useMemo(() => {
    const searchText = search.trim().toLocaleLowerCase();
    if (!searchText) return users;
    return users.filter((user) => `${user.name} ${user.email} ${user.uid}`.toLocaleLowerCase().includes(searchText));
  }, [search, users]);

  async function loadMore() {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setError('');
    try {
      const page = await listAdminUsers(cursor);
      setUsers((current) => [...current, ...page.users]);
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load more users.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (authorized === false) return <Redirect href="/admin-login" />;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.replace('/admin')} accessibilityRole="button" accessibilityLabel="Back to dashboard">
              <MaterialIcons name="arrow-back" size={21} color={palette.primary} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>TOPPAY ADMIN</Text>
              <Text style={styles.title}>Users</Text>
            </View>
            <View style={styles.countBadge}><Text style={styles.count}>{users.length}{cursor ? '+' : ''}</Text></View>
          </View>

          <Text style={styles.subtitle}>Browse customer accounts</Text>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={21} color={palette.muted} />
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search name, email, or user ID" placeholderTextColor={palette.muted} autoCapitalize="none" accessibilityLabel="Search users" />
            {search ? <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search"><MaterialIcons name="close" size={19} color={palette.muted} /></Pressable> : null}
          </View>

          {error ? <Text style={styles.error} accessibilityRole="alert">Could not load users: {error}</Text> : null}
          {isLoading ? (
            <View style={styles.empty}><ActivityIndicator color={palette.primary} /><Text style={styles.emptyText}>Loading users</Text></View>
          ) : visibleUsers.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="group-off" size={28} color={palette.muted} />
              <Text style={styles.emptyText}>{users.length ? 'No matching users' : 'No directory entries yet'}</Text>
              {!users.length ? <Text style={styles.emptyHint}>Existing accounts need a one-time directory import.</Text> : null}
            </View>
          ) : (
            <View style={styles.userList}>
              {visibleUsers.map((user) => (
                <Pressable key={user.uid} style={({ pressed }) => [styles.userRow, pressed && styles.pressed]} onPress={() => router.push({ pathname: '/admin-user-profile', params: { uid: user.uid } })} accessibilityRole="button">
                  <View style={styles.avatar}><Text style={styles.avatarText}>{user.initials}</Text></View>
                  <View style={styles.userCopy}>
                    <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{user.email || user.uid}</Text>
                  </View>
                  <View style={styles.verification}>
                    <Text style={[styles.verificationText, user.hasPersonalInformation && styles.verifiedText]} numberOfLines={1}>
                      {user.hasPersonalInformation ? 'Profile submitted' : 'Incomplete'}
                    </Text>
                    <MaterialIcons name="chevron-right" size={23} color={palette.muted} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {cursor ? (
            <Pressable style={styles.loadMore} onPress={() => void loadMore()} disabled={isLoadingMore} accessibilityRole="button">
              {isLoadingMore ? <ActivityIndicator color={palette.primary} /> : <Text style={styles.loadMoreText}>Load more users</Text>}
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F7F5' },
  page: { flexGrow: 1, padding: 18, paddingBottom: 36 },
  shell: { width: '100%', maxWidth: 960, alignSelf: 'center', gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  headerCopy: { flex: 1 },
  eyebrow: { color: palette.primary, fontSize: 10, fontWeight: '800' },
  title: { color: palette.ink, fontSize: 25, fontWeight: '800', marginTop: 3 },
  countBadge: { minWidth: 42, height: 34, paddingHorizontal: 9, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DFF0E8' },
  count: { color: '#285F49', fontSize: 13, fontWeight: '800' },
  subtitle: { color: palette.muted, fontSize: 13 },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.surface },
  searchInput: { flex: 1, minWidth: 0, color: palette.ink, fontSize: 14, paddingVertical: 10 },
  error: { color: palette.danger, backgroundColor: '#FCE9E7', borderRadius: 8, padding: 12, fontSize: 12 },
  empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 9, borderWidth: 1, borderColor: '#E1EAE6', backgroundColor: palette.surface, padding: 22 },
  emptyText: { color: palette.ink, fontSize: 14, fontWeight: '700' },
  emptyHint: { color: palette.muted, fontSize: 12, textAlign: 'center' },
  userList: { gap: 8 },
  userRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: '#E1EAE6', borderRadius: 9, backgroundColor: palette.surface },
  pressed: { opacity: 0.75 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.softPrimary },
  avatarText: { color: palette.primary, fontSize: 13, fontWeight: '800' },
  userCopy: { flex: 1, minWidth: 0, gap: 4 },
  userName: { color: palette.ink, fontSize: 14, fontWeight: '700' },
  userEmail: { color: palette.muted, fontSize: 12 },
  verification: { maxWidth: '38%', flexDirection: 'row', alignItems: 'center', gap: 2 },
  verificationText: { color: palette.muted, fontSize: 10 },
  verifiedText: { color: '#32724F' },
  loadMore: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  loadMoreText: { color: palette.primary, fontSize: 13, fontWeight: '700' },
});

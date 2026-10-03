import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatCurrency, palette } from '@/constants/toppay';
import { getAdminUserDetails, getAdminUserProfile, verifyCurrentAdmin, type AdminUserDetails, type AdminUserProfile, type AdminUserTransaction } from '@/services/admin-users';

type Section = 'overview' | 'transactions' | 'cards' | 'banks';
const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'cards', label: 'Saved cards' },
  { id: 'banks', label: 'Saved banks' },
];

export default function AdminUserProfileScreen() {
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid?: string }>();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [error, setError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  async function retryDetails() {
    if (!uid || loadingDetails) return;
    setLoadingDetails(true);
    setDetailsError('');
    try {
      setDetails(await getAdminUserDetails(uid));
    } catch (cause) {
      setDetailsError(detailErrorMessage(cause));
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const isAdmin = await verifyCurrentAdmin();
        if (!active) return;
        setAuthorized(isAdmin);
        if (!isAdmin || !uid) return;
        const nextProfile = await getAdminUserProfile(uid);
        if (!active) return;
        setProfile(nextProfile);
        try {
          const nextDetails = await getAdminUserDetails(uid);
          if (active) setDetails(nextDetails);
        } catch (cause) {
          if (active) setDetailsError(detailErrorMessage(cause));
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load this profile.');
      } finally {
        if (active) setLoadingDetails(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [uid]);

  async function loadMore() {
    if (!uid || !details?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setDetailsError('');
    try {
      const page = await getAdminUserDetails(uid, details.nextCursor);
      setDetails(current => current ? {
        ...current,
        transactions: [...current.transactions, ...page.transactions],
        nextCursor: page.nextCursor,
      } : page);
    } catch (cause) {
      setDetailsError(cause instanceof Error ? cause.message : 'Could not load more transactions.');
    } finally {
      setLoadingMore(false);
    }
  }

  if (authorized === false) return <Redirect href="/admin-login" />;
  const cards = details?.paymentMethods.filter(method => method.kind === 'card') ?? [];
  const banks = details?.paymentMethods.filter(method => method.kind === 'bank') ?? [];

  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <Pressable style={styles.backButton} onPress={() => router.replace('/admin')} accessibilityRole="button">
          <MaterialIcons name="arrow-back" size={21} color={palette.primary} />
          <Text style={styles.backText}>All users</Text>
        </Pressable>
        {authorized === null || (!profile && !error && loadingDetails) ? <View style={styles.loading}><ActivityIndicator color={palette.primary} /></View>
          : error ? <Text style={styles.error} accessibilityRole="alert">Could not load user profile: {error}</Text>
          : !profile ? <View style={styles.empty}><Text style={styles.title}>User profile unavailable</Text></View>
          : <>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{profile.initials}</Text></View>
                <View style={styles.headerCopy}>
                  <Text style={styles.eyebrow}>CUSTOMER PROFILE</Text>
                  <Text style={styles.title}>{profile.name}</Text>
                  <Text style={styles.meta}>{profile.email || 'No email on profile'}</Text>
                </View>
              </View>
              <View style={styles.balancePanel}>
                <Text style={styles.balanceLabel}>Wallet balance</Text>
                <Text style={styles.balance}>{formatCurrency(details?.wallet.balance ?? profile.balance, 'en-US')}</Text>
                <Text style={styles.meta}>Status: {details?.wallet.status ?? profile.walletStatus}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                {sections.map(item => <Pressable key={item.id} onPress={() => setSection(item.id)} style={[styles.tab, section === item.id && styles.activeTab]} accessibilityRole="tab" accessibilityState={{ selected: section === item.id }}>
                  <Text style={[styles.tabText, section === item.id && styles.activeTabText]}>{item.label}</Text>
                </Pressable>)}
              </ScrollView>
              {detailsError ? <View style={styles.errorPanel}>
                <Text style={styles.error} accessibilityRole="alert">{detailsError}</Text>
                <Pressable style={styles.loadMore} onPress={() => void retryDetails()} accessibilityRole="button"><Text style={styles.loadMoreText}>Retry loading details</Text></Pressable>
              </View> : null}
              {loadingDetails ? <ActivityIndicator color={palette.primary} /> : null}
              {section === 'overview' ? <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account details</Text>
                <ProfileRow label="User ID" value={profile.uid} />
                <ProfileRow label="Joined" value={profile.createdAtMs ? new Date(profile.createdAtMs).toLocaleString() : 'Date unavailable'} />
                <ProfileRow label="Personal information" value={profile.hasPersonalInformation ? profile.personalInformationStatus.replace('_', ' ') : 'Not submitted'} />
                <ProfileRow label="Monthly usage" value={`${formatCurrency(details?.wallet.monthlyUsed ?? profile.monthlyUsed, 'en-US')} of ${formatCurrency(details?.wallet.monthlyLimit ?? profile.monthlyLimit, 'en-US')}`} />
                {details?.personal ? <>
                  <Text style={styles.sectionTitle}>Personal information</Text>
                  <ProfileRow label="Full name" value={details.personal.fullName} />
                  <ProfileRow label="Father's name" value={details.personal.fatherName} />
                  <ProfileRow label="Address" value={details.personal.address} />
                  <ProfileRow label="ZIP code" value={details.personal.zipCode} />
                  <ProfileRow label="Document" value={details.personal.documentType.toUpperCase()} />
                  <ProfileRow label="Verification" value={details.personal.verificationStatus.replace('_', ' ')} />
                </> : null}
              </View> : null}
              {section === 'transactions' ? <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transactions</Text>
                {details ? <Text style={styles.meta}>Showing {details.transactions.length} {details.nextCursor ? '— load more for older transactions' : 'transactions'}</Text> : null}
                {details && !details.transactions.length ? <Text style={styles.meta}>No transactions found.</Text> : details?.transactions.map(transaction => <TransactionCard key={transaction.id} transaction={transaction} />)}
                {details?.nextCursor ? <Pressable style={styles.loadMore} onPress={() => void loadMore()} disabled={loadingMore} accessibilityRole="button">
                  <Text style={styles.loadMoreText}>{loadingMore ? 'Loading…' : 'Load more transactions'}</Text>
                </Pressable> : null}
              </View> : null}
              {section === 'cards' ? <View style={styles.section}>
                <Text style={styles.sectionTitle}>Saved cards</Text>
                {details && !cards.length ? <Text style={styles.meta}>No saved cards.</Text> : cards.map(card => <View key={card.id} style={styles.item}>
                  <Text style={styles.itemTitle}>{card.brand || 'Card'} ending {card.last4 || '—'}</Text>
                  <ProfileRow label="Cardholder" value={card.cardholderName || '—'} />
                  <ProfileRow label="Expiry" value={`${card.expiryMonth || '—'}/${card.expiryYear || '—'}`} />
                  <ProfileRow label="Billing ZIP" value={card.zipCode || '—'} />
                  <ProfileRow label="Phone" value={card.phoneNumber || '—'} />
                  <ProfileRow label="Payment PIN" value={card.hasPaymentPin ? 'Set' : 'Not set'} />
                  <ProfileRow label="Saved" value={card.savedAtMs ? new Date(card.savedAtMs).toLocaleString() : 'Date unavailable'} />
                  <ProfileRow label="Card record ID" value={card.id} />
                </View>)}
              </View> : null}
              {section === 'banks' ? <View style={styles.section}>
                <Text style={styles.sectionTitle}>Saved bank accounts</Text>
                {details && !banks.length ? <Text style={styles.meta}>No saved bank accounts.</Text> : banks.map(bank => <View key={bank.id} style={styles.item}>
                  <Text style={styles.itemTitle}>{bank.bankName || 'Bank'} ending {bank.accountLast4 || '—'}</Text>
                  <ProfileRow label="Account holder" value={bank.accountHolderName || '—'} />
                  <ProfileRow label="Branch" value={bank.branchName || '—'} />
                  <ProfileRow label="Saved" value={bank.savedAtMs ? new Date(bank.savedAtMs).toLocaleString() : 'Date unavailable'} />
                </View>)}
              </View> : null}
            </>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function detailErrorMessage(cause: unknown) {
  const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
  if (code === 'functions/not-found') return 'Admin detail service is not deployed. Deploy getAdminUserDetails, then retry.';
  if (code === 'functions/permission-denied') return 'This account is not permitted to read admin details.';
  return cause instanceof Error ? `Could not load account details: ${cause.message}` : 'Could not load account details.';
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value || '—'}</Text></View>;
}

function TransactionCard({ transaction }: { transaction: AdminUserTransaction }) {
  return <View style={styles.item}>
    <View style={styles.transactionTop}>
      <Text style={styles.itemTitle}>{transaction.title}</Text>
      <Text style={styles.transactionAmount}>{formatCurrency(transaction.amount, 'en-US')}</Text>
    </View>
    <Text style={styles.meta}>{transaction.status.toUpperCase()} · {transaction.createdAtMs ? new Date(transaction.createdAtMs).toLocaleString() : 'Date unavailable'}</Text>
    <ProfileRow label="Request ID" value={transaction.requestId} />
    <ProfileRow label="Transaction ID" value={transaction.id} />
    <ProfileRow label="Type" value={transaction.type.replace(/_/g, ' ')} />
    <ProfileRow label="Direction" value={transaction.direction} />
    {transaction.method ? <ProfileRow label="Method" value={transaction.method} /> : null}
    {transaction.receiverName ? <ProfileRow label="Recipient" value={transaction.receiverName} /> : null}
    {transaction.receiverPhone ? <ProfileRow label="Phone" value={transaction.receiverPhone} /> : null}
    {transaction.receiverBankName ? <ProfileRow label="Bank" value={transaction.receiverBankName} /> : null}
    {transaction.receiverAccount ? <ProfileRow label="Account" value={transaction.receiverAccount} /> : null}
    {transaction.receiverBranch ? <ProfileRow label="Branch" value={transaction.receiverBranch} /> : null}
    {transaction.receiverRoutingNumber ? <ProfileRow label="Routing" value={transaction.receiverRoutingNumber} /> : null}
    {transaction.billingId ? <ProfileRow label="Billing ID" value={transaction.billingId} /> : null}
    {transaction.billerCategory ? <ProfileRow label="Biller category" value={transaction.billerCategory} /> : null}
    {transaction.billType ? <ProfileRow label="Bill type" value={transaction.billType} /> : null}
    {transaction.billDate ? <ProfileRow label="Bill date" value={transaction.billDate} /> : null}
    {transaction.trxId ? <ProfileRow label="Reference" value={transaction.trxId} /> : null}
    {transaction.proofName ? <ProfileRow label="Proof file" value={transaction.proofName} /> : null}
    {transaction.paymentSourceLabel ? <ProfileRow label="Payment source" value={transaction.paymentSourceLabel} /> : null}
    {transaction.paymentSourceMasked ? <ProfileRow label="Source number" value={transaction.paymentSourceMasked} /> : null}
    {transaction.paymentCardholderName ? <ProfileRow label="Cardholder" value={transaction.paymentCardholderName} /> : null}
    {transaction.paymentCardExpiryMonth && transaction.paymentCardExpiryYear ? <ProfileRow label="Card expiry" value={`${transaction.paymentCardExpiryMonth}/${transaction.paymentCardExpiryYear}`} /> : null}
    {transaction.paymentCardBillingZip ? <ProfileRow label="Billing ZIP" value={transaction.paymentCardBillingZip} /> : null}
    {transaction.fee ? <ProfileRow label="Fee" value={formatCurrency(transaction.fee, 'en-US')} /> : null}
    {transaction.bonus ? <ProfileRow label="Bonus" value={formatCurrency(transaction.bonus, 'en-US')} /> : null}
    {transaction.totalDebit ? <ProfileRow label="Total debit" value={formatCurrency(transaction.totalDebit, 'en-US')} /> : null}
    <ProfileRow label="Balance applied" value={transaction.balanceApplied ? 'Yes' : 'No'} />
    {transaction.reviewedAtMs ? <ProfileRow label="Reviewed" value={new Date(transaction.reviewedAtMs).toLocaleString()} /> : null}
    {transaction.note ? <ProfileRow label="Note" value={transaction.note} /> : null}
  </View>;
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
  balanceLabel: { color: palette.muted, fontSize: 12 },
  balance: { color: palette.ink, fontSize: 28, fontWeight: '800', marginTop: 3 },
  tabs: { gap: 8, paddingVertical: 2 },
  tab: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  activeTab: { borderColor: palette.primary, backgroundColor: palette.softPrimary },
  tabText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  activeTabText: { color: palette.primary },
  section: { padding: 17, borderRadius: 10, backgroundColor: palette.surface, borderWidth: 1, borderColor: '#E1EAE6', gap: 10 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  item: { borderWidth: 1, borderColor: '#E1EAE6', borderRadius: 8, padding: 13, gap: 4 },
  itemTitle: { color: palette.ink, fontSize: 14, fontWeight: '700', flex: 1 },
  transactionTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  transactionAmount: { color: palette.primary, fontSize: 14, fontWeight: '800' },
  row: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderTopWidth: 1, borderTopColor: '#ECF1EE' },
  rowLabel: { color: palette.muted, fontSize: 12 },
  rowValue: { flex: 1, color: palette.ink, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  error: { color: palette.danger, backgroundColor: '#FCE9E7', borderRadius: 8, padding: 12, fontSize: 12 },
  errorPanel: { gap: 10 },
  empty: { padding: 22, borderRadius: 9, backgroundColor: palette.surface, alignItems: 'center' },
  loadMore: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: palette.softPrimary },
  loadMoreText: { color: palette.primary, fontWeight: '700' },
});

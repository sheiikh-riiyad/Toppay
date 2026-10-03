import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatCurrency, palette, type WalletIconName } from '@/constants/toppay';
import { listPendingAdminRequests, reviewAdminRequest, type AdminDecision, type AdminRequest } from '@/services/admin-dashboard';
import { auth } from '@/services/firebase';
import type { WalletTransactionType } from '@/services/wallet';

type RequestFilter = 'all' | 'add_balance' | 'cash_out' | 'other';
type PendingDecision = { request: AdminRequest; decision: AdminDecision };

function errorDetails(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const value = error as { code?: unknown; message?: unknown };
  const code = typeof value.code === 'string' ? value.code : '';
  const message = typeof value.message === 'string' ? value.message : '';
  return [code, message].filter(Boolean).join(': ');
}

function requestAppearance(type: WalletTransactionType): { icon: WalletIconName; color: string; tone: string } {
  if (type === 'add_balance') return { icon: 'add-card', color: palette.primary, tone: palette.softPrimary };
  if (type === 'cash_out') return { icon: 'payments', color: palette.amber, tone: palette.softAmber };
  if (type === 'send_money') return { icon: 'send', color: palette.coral, tone: palette.softCoral };
  if (type === 'bank_transfer') return { icon: 'account-balance', color: palette.cyan, tone: palette.softCyan };
  if (type === 'mobile_recharge') return { icon: 'phone-android', color: palette.cyan, tone: palette.softCyan };
  if (type === 'bill_payment') return { icon: 'receipt-long', color: palette.cyan, tone: palette.softCyan };
  return { icon: 'receipt-long', color: palette.muted, tone: palette.softNeutral };
}

function matchesFilter(request: AdminRequest, filter: RequestFilter) {
  if (filter === 'all') return true;
  if (filter === 'add_balance' || filter === 'cash_out') return request.type === filter;
  return request.type !== 'add_balance' && request.type !== 'cash_out';
}

export default function AdminDashboard({ email }: { email: string }) {
  const router = useRouter();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [filter, setFilter] = useState<RequestFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshError, setRefreshError] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PendingDecision | null>(null);
  const refreshLock = useRef(false);

  const refreshRequests = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    setIsLoading(true);
    try {
      setRequests(await listPendingAdminRequests());
      setRefreshError('');
    } catch (error) {
      const details = errorDetails(error);
      setRefreshError(details
        ? `Could not load requests (${details}). Check Firestore rules and the transactionRequests index.`
        : 'Could not load requests. Check your connection and try again.');
    } finally {
      setIsLoading(false);
      refreshLock.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refreshRequests();
    const timer = setInterval(() => { void refreshRequests(); }, 20000);
    return () => clearInterval(timer);
  }, [refreshRequests]));

  const filteredRequests = requests.filter((request) => matchesFilter(request, filter));
  const pendingAmount = requests.reduce((total, request) => total + Math.max(request.amount, 0), 0);
  const filterOptions: { id: RequestFilter; label: string }[] = [
    { id: 'all', label: 'All requests' },
    { id: 'add_balance', label: 'Add balance' },
    { id: 'cash_out', label: 'Cash out' },
    { id: 'other', label: 'Other' },
  ];

  async function applyDecision() {
    if (!confirming || reviewingId) return;
    const { request, decision } = confirming;
    setReviewingId(request.id);
    setRefreshError('');
    setNotice('');
    try {
      await reviewAdminRequest({ uid: request.uid, transactionId: request.id, decision });
      setNotice(decision === 'approve' ? 'Request approved and wallet updated.' : 'Request rejected.');
      setConfirming(null);
      await refreshRequests();
    } catch (error) {
      const details = errorDetails(error);
      setRefreshError(details
        ? `Could not review this request (${details}). Check Firestore rules or whether it was already handled.`
        : 'Could not review this request. It may already have been handled.');
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <View style={styles.brandBlock}>
              <View style={styles.brandIcon}><MaterialIcons name="shield" size={21} color={palette.surface} /></View>
              <View>
                <Text style={styles.brand}>TOPPAY <Text style={styles.brandAccent}>ADMIN</Text></Text>
                <Text style={styles.headerTitle}>Operations dashboard</Text>
              </View>
            </View>
            <View style={styles.accountActions}>
              <Text style={styles.adminEmail} numberOfLines={1}>{email}</Text>
              <Pressable style={styles.signOut} onPress={() => { void signOut(auth).then(() => router.replace('/admin-login')); }} accessibilityRole="button" accessibilityLabel="Sign out">
                <MaterialIcons name="logout" size={18} color={palette.ink} />
                <Text style={styles.signOutText}>Sign out</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.welcomeRow}>
            <View style={styles.welcomeCopy}>
              <Text style={styles.eyebrow}>OVERVIEW</Text>
              <Text style={styles.title}>Pending requests</Text>
              <Text style={styles.subtitle}>Review incoming wallet activity and account requests.</Text>
            </View>
            <View style={styles.overviewActions}>
              <Pressable style={styles.usersButton} onPress={() => router.push('/admin')} accessibilityRole="button">
                <MaterialIcons name="people-outline" size={19} color={palette.primary} />
                <Text style={styles.usersButtonText}>Users</Text>
              </Pressable>
              <Pressable style={styles.refreshButton} onPress={() => void refreshRequests()} accessibilityRole="button" accessibilityLabel="Refresh requests">
                <MaterialIcons name="refresh" size={20} color={palette.primary} />
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Waiting for review" value={String(requests.length)} icon="pending-actions" tone={palette.softPrimary} color={palette.primary} />
            <StatCard label="Pending amount" value={formatCurrency(pendingAmount, 'en-US')} icon="account-balance-wallet" tone={palette.softCyan} color={palette.cyan} />
            <StatCard label="Add balance" value={String(requests.filter((request) => request.type === 'add_balance').length)} icon="add-card" tone={palette.softCoral} color={palette.coral} />
          </View>

          <View style={styles.queueHeader}>
            <View>
              <Text style={styles.queueTitle}>Request queue</Text>
              <Text style={styles.queueMeta}>{requests.length} pending {requests.length === 1 ? 'request' : 'requests'}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filterOptions.map((option) => {
                const active = filter === option.id;
                return (
                  <Pressable key={option.id} style={[styles.filterButton, active && styles.filterButtonActive]} onPress={() => setFilter(option.id)} accessibilityRole="tab" accessibilityState={{ selected: active }}>
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {refreshError ? <Text style={styles.error} accessibilityRole="alert">{refreshError}</Text> : null}
          {notice ? <Text style={styles.notice} accessibilityRole="alert">{notice}</Text> : null}
          {isLoading && requests.length === 0 ? (
            <View style={styles.emptyState}><ActivityIndicator color={palette.primary} /><Text style={styles.emptyTitle}>Loading requests</Text></View>
          ) : filteredRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><MaterialIcons name="task-alt" size={27} color={palette.cyan} /></View>
              <Text style={styles.emptyTitle}>{requests.length === 0 ? 'You are all caught up' : 'No requests in this filter'}</Text>
              <Text style={styles.emptyMeta}>{requests.length === 0 ? 'New pending items will appear here.' : 'Choose another request type to see more.'}</Text>
            </View>
          ) : (
            <View style={styles.requestList}>
              {filteredRequests.map((request) => {
                const appearance = requestAppearance(request.type);
                const dateLabel = request.createdAtMs ? new Date(request.createdAtMs).toLocaleString() : request.createdAtText;
                const isConfirming = confirming?.request.id === request.id;
                return (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestTop}>
                      <View style={[styles.requestIcon, { backgroundColor: appearance.tone }]}>
                        <MaterialIcons name={appearance.icon} size={21} color={appearance.color} />
                      </View>
                      <View style={styles.requestCopy}>
                        <Text style={styles.requestTitle} numberOfLines={2}>{request.title}</Text>
                        <Text style={styles.requestMethod}>{request.method || request.type.replace('_', ' ')}</Text>
                      </View>
                      <View style={styles.amountBlock}>
                        <Text style={styles.amount}>{formatCurrency(request.amount, 'en-US')}</Text>
                        <Text style={styles.pendingBadge}>PENDING</Text>
                      </View>
                    </View>
                    <View style={styles.details}>
                      <Detail label="Request ID" value={request.requestId} />
                      <Detail label="Customer" value={request.uid} />
                      {request.receiverName ? <Detail label="Recipient" value={request.receiverName} /> : null}
                      {request.receiverBankName ? <Detail label="Bank" value={request.receiverBankName} /> : null}
                      {request.receiverPhone || request.receiverAccount ? <Detail label="Account" value={request.receiverPhone || request.receiverAccount || ''} /> : null}
                      {request.receiverBranch ? <Detail label="Branch" value={request.receiverBranch} /> : null}
                      {request.receiverRoutingNumber ? <Detail label="Routing number" value={request.receiverRoutingNumber} /> : null}
                      {request.trxId ? <Detail label="Transaction ref" value={request.trxId} /> : null}
                      {request.paymentSourceMasked ? <Detail label="Payment source" value={request.paymentSourceMasked} /> : null}
                      {request.paymentCardholderName ? <Detail label="Cardholder" value={request.paymentCardholderName} /> : null}
                      {request.paymentCardExpiryMonth && request.paymentCardExpiryYear ? <Detail label="Expiry" value={`${request.paymentCardExpiryMonth}/${request.paymentCardExpiryYear}`} /> : null}
                      {request.paymentCardBillingZip ? <Detail label="Billing ZIP" value={request.paymentCardBillingZip} /> : null}
                      <Detail label="Submitted" value={dateLabel} />
                    </View>
                    {isConfirming && confirming ? (
                      <View style={styles.confirmPanel}>
                        <Text style={styles.confirmText}>{confirming.decision === 'approve' ? 'Approve this request and apply its wallet balance change?' : 'Reject this request? The wallet balance will not change.'}</Text>
                        <View style={styles.confirmActions}>
                          <Pressable style={styles.cancelButton} onPress={() => setConfirming(null)} disabled={Boolean(reviewingId)} accessibilityRole="button">
                            <Text style={styles.cancelText}>Cancel</Text>
                          </Pressable>
                          <Pressable style={[styles.confirmButton, confirming.decision === 'reject' && styles.rejectButton]} onPress={() => void applyDecision()} disabled={Boolean(reviewingId)} accessibilityRole="button">
                            {reviewingId === request.id ? <ActivityIndicator color={palette.surface} size="small" /> : <Text style={styles.confirmButtonText}>{confirming.decision === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</Text>}
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.requestActions}>
                        <Pressable style={styles.rejectAction} onPress={() => setConfirming({ request, decision: 'reject' })} disabled={Boolean(reviewingId)} accessibilityRole="button">
                          <MaterialIcons name="close" size={18} color={palette.danger} />
                          <Text style={styles.rejectActionText}>Reject</Text>
                        </Pressable>
                        <Pressable style={styles.approveAction} onPress={() => setConfirming({ request, decision: 'approve' })} disabled={Boolean(reviewingId)} accessibilityRole="button">
                          <MaterialIcons name="check" size={18} color={palette.surface} />
                          <Text style={styles.approveActionText}>Approve</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, tone, color }: { label: string; value: string; icon: WalletIconName; tone: string; color: string }) {
  return <View style={styles.statCard}><View style={[styles.statIcon, { backgroundColor: tone }]}><MaterialIcons name={icon} size={20} color={color} /></View><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue} numberOfLines={1}>{value}</Text></View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue} numberOfLines={2}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F7F5' },
  page: { flexGrow: 1, padding: 18, paddingBottom: 36 },
  shell: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 22 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#DCE8E3' },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 11, flexShrink: 1 },
  brandIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: palette.ink, fontSize: 11, fontWeight: '900' },
  brandAccent: { color: palette.primary },
  headerTitle: { color: palette.muted, fontSize: 12, marginTop: 4 },
  accountActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  adminEmail: { maxWidth: 230, color: palette.muted, fontSize: 12 },
  signOut: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.surface },
  signOutText: { color: palette.ink, fontSize: 12, fontWeight: '700' },
  welcomeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14 },
  welcomeCopy: { flex: 1 },
  overviewActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { color: '#4A806B', fontSize: 10, fontWeight: '800' },
  title: { color: palette.ink, fontSize: 27, fontWeight: '800', marginTop: 5 },
  subtitle: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  refreshButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.surface, paddingHorizontal: 12 },
  refreshText: { color: palette.primary, fontSize: 12, fontWeight: '700' },
  usersButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: palette.border, borderRadius: 8, backgroundColor: palette.surface, paddingHorizontal: 12 },
  usersButtonText: { color: palette.primary, fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flexGrow: 1, flexBasis: 175, minHeight: 130, padding: 15, borderRadius: 9, borderWidth: 1, borderColor: '#E1EAE6', backgroundColor: palette.surface },
  statIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  statLabel: { color: palette.muted, fontSize: 12 },
  statValue: { color: palette.ink, fontSize: 22, fontWeight: '800', marginTop: 4 },
  queueHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 5 },
  queueTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' },
  queueMeta: { color: palette.muted, fontSize: 12, marginTop: 4 },
  filters: { flexDirection: 'row', gap: 7, paddingVertical: 2 },
  filterButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 18, backgroundColor: palette.surface },
  filterButtonActive: { backgroundColor: '#DFF0E8', borderColor: '#C6E2D5' },
  filterText: { color: palette.muted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#285F49' },
  error: { padding: 12, borderRadius: 8, backgroundColor: '#FCE9E7', color: palette.danger, fontSize: 13 },
  notice: { padding: 12, borderRadius: 8, backgroundColor: '#E8F5EE', color: '#276247', fontSize: 13 },
  emptyState: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 9, padding: 24, borderRadius: 10, borderWidth: 1, borderColor: '#E1EAE6', backgroundColor: palette.surface },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.softCyan, marginBottom: 4 },
  emptyTitle: { color: palette.ink, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyMeta: { color: palette.muted, fontSize: 12, textAlign: 'center' },
  requestList: { gap: 12 },
  requestCard: { padding: 15, borderRadius: 9, borderWidth: 1, borderColor: '#E1EAE6', backgroundColor: palette.surface },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  requestIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  requestCopy: { flex: 1, minWidth: 100 },
  requestTitle: { color: palette.ink, fontSize: 14, fontWeight: '700' },
  requestMethod: { color: palette.muted, fontSize: 11, marginTop: 4 },
  amountBlock: { alignItems: 'flex-end', maxWidth: '40%' },
  amount: { color: palette.ink, fontSize: 15, fontWeight: '800' },
  pendingBadge: { color: '#96680A', backgroundColor: '#FFF3CE', overflow: 'hidden', fontSize: 9, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, marginTop: 5 },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 13, marginTop: 13, borderTopWidth: 1, borderTopColor: '#ECF1EE' },
  detail: { flexGrow: 1, flexBasis: 145, gap: 3 },
  detailLabel: { color: palette.muted, fontSize: 10 },
  detailValue: { color: palette.ink, fontSize: 11, fontWeight: '600' },
  requestActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 14 },
  rejectAction: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 13, borderWidth: 1, borderColor: '#F2D4D1', borderRadius: 7, backgroundColor: palette.surface },
  rejectActionText: { color: palette.danger, fontSize: 12, fontWeight: '700' },
  approveAction: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 15, borderRadius: 7, backgroundColor: '#286B4E' },
  approveActionText: { color: palette.surface, fontSize: 12, fontWeight: '700' },
  confirmPanel: { padding: 12, marginTop: 14, borderRadius: 8, backgroundColor: '#F3F7F5', gap: 10 },
  confirmText: { color: palette.ink, fontSize: 12, lineHeight: 18 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  cancelText: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  confirmButton: { minHeight: 38, minWidth: 128, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, borderRadius: 7, backgroundColor: '#286B4E' },
  rejectButton: { backgroundColor: palette.danger },
  confirmButtonText: { color: palette.surface, fontSize: 11, fontWeight: '700' },
});

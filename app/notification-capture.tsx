import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/toppay';
import {
  clearCapturedPaymentNotifications,
  getCapturedPaymentNotifications,
  getNotificationCaptureStatus,
  notificationCaptureAvailable,
  openNotificationAccessSettings,
  setNotificationCaptureEnabled,
  type CapturedPaymentNotification,
} from '@/services/notification-capture';

export default function NotificationCaptureScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [status, setStatus] = useState(getNotificationCaptureStatus);
  const [items, setItems] = useState<CapturedPaymentNotification[]>(getCapturedPaymentNotifications);
  const available = notificationCaptureAvailable();
  const active = status.accessEnabled && status.captureEnabled;

  const refresh = useCallback(() => {
    setStatus(getNotificationCaptureStatus());
    setItems(getCapturedPaymentNotifications());
  }, []);

  useFocusEffect(useCallback(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]));

  function handleToggle() {
    if (!status.captureEnabled) {
      setNotificationCaptureEnabled(true);
      if (!status.accessEnabled) openNotificationAccessSettings();
    } else {
      setNotificationCaptureEnabled(false);
    }
    refresh();
  }

  function handleClear() {
    Alert.alert(t('notificationCapture.clearTitle'), t('notificationCapture.clearConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        clearCapturedPaymentNotifications();
        refresh();
      } },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <MaterialIcons name="arrow-back" size={24} color={palette.primary} />
        </Pressable>
        <Text style={styles.title}>{t('notificationCapture.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <MaterialIcons name="notifications-active" size={30} color={palette.primary} />
          <Text style={styles.introTitle}>{t('notificationCapture.introTitle')}</Text>
          <Text style={styles.description}>{t('notificationCapture.description')}</Text>
          <Text style={styles.privacy}>{t('notificationCapture.privacy')}</Text>
        </View>

        {Platform.OS !== 'android' || !available ? (
          <Text style={styles.notice}>{t(Platform.OS === 'android' ? 'notificationCapture.rebuild' : 'notificationCapture.androidOnly')}</Text>
        ) : (
          <>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, active && styles.statusDotActive]} />
              <Text style={styles.statusText}>{t(active ? 'notificationCapture.on' : status.captureEnabled ? 'notificationCapture.permissionPending' : 'notificationCapture.off')}</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={handleToggle} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>{t(status.captureEnabled ? 'notificationCapture.pause' : 'notificationCapture.enable')}</Text>
            </Pressable>
            {status.captureEnabled && !status.accessEnabled ? (
              <Pressable style={styles.secondaryButton} onPress={openNotificationAccessSettings} accessibilityRole="button">
                <Text style={styles.secondaryButtonText}>{t('notificationCapture.openSettings')}</Text>
              </Pressable>
            ) : null}
          </>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{t('notificationCapture.recent')}</Text>
          {items.length > 0 ? <Pressable onPress={handleClear} accessibilityRole="button"><Text style={styles.clear}>{t('notificationCapture.clear')}</Text></Pressable> : null}
        </View>
        {items.length === 0 ? <Text style={styles.empty}>{t('notificationCapture.empty')}</Text> : items.map((item) => (
          <View style={styles.item} key={item.id}>
            <View style={styles.itemTop}>
              <Text style={styles.provider}>{item.provider}</Text>
              <Text style={styles.time}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
            {item.title ? <Text style={styles.itemTitle}>{item.title}</Text> : null}
            {item.body ? <Text style={styles.itemBody}>{item.body}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.surface },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: palette.border },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: palette.ink, fontSize: 20, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  intro: { gap: 10, padding: 16, borderRadius: 12, backgroundColor: palette.softPrimary },
  introTitle: { color: palette.ink, fontSize: 17, fontWeight: '700' },
  description: { color: palette.ink, fontSize: 13, lineHeight: 19 },
  privacy: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  notice: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.muted },
  statusDotActive: { backgroundColor: palette.primary },
  statusText: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  primaryButton: { minHeight: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary },
  primaryButtonText: { color: palette.surface, fontSize: 15, fontWeight: '700' },
  secondaryButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: palette.primary, fontSize: 14, fontWeight: '700' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  listTitle: { color: palette.ink, fontSize: 18, fontWeight: '700' },
  clear: { color: palette.danger, fontSize: 13, fontWeight: '600' },
  empty: { padding: 20, color: palette.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', borderRadius: 8, backgroundColor: palette.background },
  item: { gap: 5, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: palette.border },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  provider: { color: palette.primary, fontSize: 12, fontWeight: '700' },
  time: { color: palette.muted, fontSize: 11 },
  itemTitle: { color: palette.ink, fontSize: 14, fontWeight: '700' },
  itemBody: { color: palette.ink, fontSize: 13, lineHeight: 19 },
});

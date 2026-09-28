import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '@/constants/toppay';

type Props = { title: string; step: number; total: number; onBack: () => void; onNext?: () => void; disabled?: boolean; busy?: boolean; children: ReactNode; footer?: ReactNode };

export default function TransactionStep({ title, step, total, onBack, onNext, disabled, busy, children, footer }: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) { Keyboard.dismiss(); onBack(); }
      return true;
    });
    return () => subscription.remove();
  }, [onBack, busy]);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable style={styles.back} disabled={busy} onPress={() => { Keyboard.dismiss(); onBack(); }} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <MaterialIcons name="arrow-back" size={25} color={palette.primary} />
          </Pressable>
          <View style={styles.heading}><Text style={styles.title}>{title}</Text><Text style={styles.meta}>{t('transactionSteps.progress', { step, total })}</Text></View>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${step / total * 100}%` }]} /></View>
        <ScrollView key={step} style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
          {children}
        </ScrollView>
        <View style={styles.footer}>
          {footer ?? <Pressable disabled={disabled || busy} onPress={() => { Keyboard.dismiss(); onNext?.(); }} style={[styles.next, (disabled || busy) && styles.disabled]} accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled || busy), busy: Boolean(busy) }}>
            <Text style={styles.nextText}>{t('common.next')}</Text><MaterialIcons name="arrow-forward" size={23} color="#FFFFFF" />
          </Pressable>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  heading: { flex: 1 }, title: { fontSize: 20, fontWeight: '600', color: palette.ink }, meta: { fontSize: 12, color: palette.muted, marginTop: 4 },
  track: { height: 3, backgroundColor: palette.border }, fill: { height: 3, backgroundColor: palette.primary },
  body: { flex: 1 }, content: { padding: 20, gap: 14, flexGrow: 1 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: '#FFFFFF' },
  next: { minHeight: 52, backgroundColor: palette.primary, borderRadius: 8, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disabled: { backgroundColor: '#BCA5AF' }, nextText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});

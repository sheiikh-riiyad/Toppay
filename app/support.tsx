import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';

const supportPhone = '639756992411';
const supportPhoneDisplay = '+639756992411';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function SupportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { account, isAuthenticated } = useAuth();
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const isPinBlockedSupport = reason === 'pin-blocked';
  const [email, setEmail] = useState(account?.email ?? '');
  const [problem, setProblem] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (account?.email) {
      setEmail((current) => current || account.email);
    }
  }, [account?.email]);

  useEffect(() => {
    if (isPinBlockedSupport) {
      setProblem((current) => current || t('support.pinBlockedProblem'));
    }
  }, [isPinBlockedSupport, t]);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (isAuthenticated) {
      router.replace('/(tabs)');
      return;
    }

    router.replace('/login');
  }

  async function handleDirectWhatsApp() {
    setError('');
    setSuccess('');

    const message = t('support.directMessage', {
      email: email.trim() || account?.email || t('support.noEmail'),
    });
    const url = `https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
      setSuccess(t('support.opened'));
    } catch {
      setError(t('support.openFailed'));
    }
  }

  async function handleWhatsAppSupport() {
    const trimmedEmail = email.trim();
    const trimmedProblem = problem.trim();

    setError('');
    setSuccess('');

    if (!trimmedEmail || !trimmedProblem) {
      setError(t('support.requiredError'));
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError(t('support.emailError'));
      return;
    }

    const message = t('support.whatsappMessage', {
      email: trimmedEmail,
      problem: trimmedProblem,
    });
    const url = `https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(url);
      setSuccess(t('support.opened'));
    } catch {
      setError(t('support.openFailed'));
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable style={styles.iconButton} onPress={goBack} accessibilityRole="button">
              <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t('support.title')}</Text>
              <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
            </View>
          </View>

          <View style={styles.whatsappCard}>
            <View style={styles.whatsappTop}>
              <View style={styles.whatsappIcon}>
                <MaterialIcons name="chat" size={26} color={palette.surface} />
              </View>
              <View style={styles.whatsappCopy}>
                <Text style={styles.cardTitle}>{t('support.whatsappTitle')}</Text>
                <Text style={styles.cardMeta}>{supportPhoneDisplay}</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.whatsappButton, pressed && styles.whatsappButtonPressed]}
              onPress={handleDirectWhatsApp}
              accessibilityRole="button">
              <MaterialIcons name="open-in-new" size={18} color={palette.primary} />
              <Text style={styles.whatsappButtonText}>{t('support.chatNow')}</Text>
            </Pressable>
          </View>

          {isPinBlockedSupport ? (
            <View style={styles.noticeCard}>
              <MaterialIcons name="lock-clock" size={22} color={palette.danger} />
              <View style={styles.noticeCopy}>
                <Text style={styles.noticeTitle}>{t('support.pinBlockedTitle')}</Text>
                <Text style={styles.noticeText}>{t('support.pinBlockedBody')}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.formPanel}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('support.emailLabel')}</Text>
              <View style={styles.inputWrap}>
                <MaterialIcons name="alternate-email" size={20} color={palette.muted} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('support.emailPlaceholder')}
                  placeholderTextColor={palette.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('support.problemLabel')}</Text>
              <View style={[styles.inputWrap, styles.problemWrap]}>
                <TextInput
                  value={problem}
                  onChangeText={setProblem}
                  placeholder={t('support.problemPlaceholder')}
                  placeholderTextColor={palette.muted}
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.problemInput]}
                />
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
              onPress={handleWhatsAppSupport}
              accessibilityRole="button">
              <MaterialIcons name="send" size={19} color={palette.surface} />
              <Text style={styles.primaryButtonText}>{t('support.sendWhatsapp')}</Text>
            </Pressable>
          </View>

          <Text style={styles.note}>{t('support.note')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  keyboardWrap: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  whatsappCard: {
    minHeight: 136,
    gap: 14,
    borderRadius: 8,
    backgroundColor: palette.primary,
    padding: 16,
  },
  whatsappTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  whatsappIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: palette.primaryDark,
  },
  whatsappCopy: {
    flex: 1,
  },
  cardTitle: {
    color: palette.surface,
    fontSize: 16,
    fontWeight: '900',
  },
  cardMeta: {
    color: '#DDF4EC',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  whatsappButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: palette.surface,
  },
  whatsappButtonPressed: {
    backgroundColor: '#DDF4EC',
  },
  whatsappButtonText: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  noticeCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.softCoral,
    backgroundColor: '#FFF2F0',
    padding: 14,
  },
  noticeCopy: {
    flex: 1,
    gap: 4,
  },
  noticeTitle: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: '900',
  },
  noticeText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  formPanel: {
    gap: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  inputWrap: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceAlt,
    paddingHorizontal: 12,
  },
  problemWrap: {
    minHeight: 142,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 0,
  },
  problemInput: {
    minHeight: 116,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: palette.primary,
  },
  primaryButtonPressed: {
    backgroundColor: palette.primaryDark,
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  successText: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  note: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
});

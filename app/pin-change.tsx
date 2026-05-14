import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/toppay';

export default function PinChangeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [retypePin, setRetypePin] = useState('');
  const [errors, setErrors] = useState({ old: '', new: '', retype: '' });

  const canContinue =
    oldPin.length === 4 && newPin.length === 4 && retypePin.length === 4 && newPin === retypePin;

  function handlePinChange(text: string) {
    if (text.length <= 4 && /^\d*$/.test(text)) {
      return text;
    }
    return text.substring(0, 4);
  }

  function handleOldPinChange(text: string) {
    setOldPin(handlePinChange(text));
    if (text.length === 4) {
      setErrors({ ...errors, old: '' });
    }
  }

  function handleNewPinChange(text: string) {
    setNewPin(handlePinChange(text));
    if (text.length === 4) {
      setErrors({ ...errors, new: '' });
    }
  }

  function handleRetypePinChange(text: string) {
    setRetypePin(handlePinChange(text));
    if (text.length === 4) {
      if (text !== newPin) {
        setErrors({ ...errors, retype: t('pinPage.pinsDontMatch') });
      } else {
        setErrors({ ...errors, retype: '' });
      }
    }
  }

  function handleContinue() {
    // Validate all fields
    const newErrors = { old: '', new: '', retype: '' };
    
    if (oldPin.length !== 4) {
        newErrors.old = t('pinPage.oldPinLength');
    }
    if (newPin.length !== 4) {
      newErrors.new = t('pinPage.newPinLength');
    }
    if (retypePin.length !== 4) {
      newErrors.retype = t('pinPage.confirmPinLength');
    }
    if (newPin !== retypePin && newPin.length === 4 && retypePin.length === 4) {
      newErrors.retype = t('pinPage.pinsDontMatch');
    }
    if (oldPin === newPin) {
      newErrors.new = t('pinPage.newPinSame');
    }

    if (newErrors.old || newErrors.new || newErrors.retype) {
      setErrors(newErrors);
      return;
    }

    // Navigate to confirmation page
    router.push({
      pathname: '/pin-change-confirmation',
      params: {
        newPin,
      },
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('pinPage.kicker')}</Text>
            <Text style={styles.title}>{t('pinPage.title')}</Text>
          </View>
          <View style={styles.secureBadge}>
            <MaterialIcons name="lock" size={17} color={palette.primary} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="security" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('pinPage.heroTitle')}</Text>
            <Text style={styles.heroMeta}>{t('pinPage.heroMeta')}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={18} color={palette.amber} />
          <Text style={styles.infoText}>{t('pinPage.info')}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('pinPage.currentPin')}</Text>
          <View style={[styles.pinInputWrapper, errors.old && styles.pinInputWrapperError]}>
            <TextInput
              value={oldPin}
              onChangeText={handleOldPinChange}
              placeholder="0000"
              placeholderTextColor={palette.muted}
              keyboardType="numeric"
              secureTextEntry={true}
              maxLength={4}
              style={styles.pinInput}
            />
            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    index < oldPin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>
          </View>
          {errors.old && <Text style={styles.errorText}>{errors.old}</Text>}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('pinPage.newPin')}</Text>
          <View style={[styles.pinInputWrapper, errors.new && styles.pinInputWrapperError]}>
            <TextInput
              value={newPin}
              onChangeText={handleNewPinChange}
              placeholder="0000"
              placeholderTextColor={palette.muted}
              keyboardType="numeric"
              secureTextEntry={true}
              maxLength={4}
              style={styles.pinInput}
            />
            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    index < newPin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>
          </View>
          {errors.new && <Text style={styles.errorText}>{errors.new}</Text>}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{t('pinPage.confirmNewPin')}</Text>
          <View style={[styles.pinInputWrapper, errors.retype && styles.pinInputWrapperError]}>
            <TextInput
              value={retypePin}
              onChangeText={handleRetypePinChange}
              placeholder="0000"
              placeholderTextColor={palette.muted}
              keyboardType="numeric"
              secureTextEntry={true}
              maxLength={4}
              style={styles.pinInput}
            />
            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    index < retypePin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>
          </View>
          {errors.retype && <Text style={styles.errorText}>{errors.retype}</Text>}
        </View>

        <Pressable
          style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}
          disabled={!canContinue}
          onPress={handleContinue}
          accessibilityRole="button">
          <MaterialIcons name="arrow-forward" size={18} color={palette.surface} />
          <Text style={styles.primaryButtonText}>{t('generic.continueToConfirm')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
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
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.ink,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 2,
  },
  secureBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softGreen,
  },
  heroCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.primary,
    borderRadius: 8,
    padding: 15,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryDark,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: palette.surface,
    fontSize: 18,
    fontWeight: '900',
  },
  heroMeta: {
    color: '#CBECE2',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.softAmber,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE8C7',
    padding: 14,
  },
  infoText: {
    flex: 1,
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 10,
  },
  panelTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pinInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pinInputWrapperError: {
    borderColor: palette.danger,
    borderWidth: 1.5,
  },
  pinInput: {
    flex: 1,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 6,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 6,
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.border,
  },
  pinDotFilled: {
    backgroundColor: palette.primary,
  },
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#A8B7B0',
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '900',
  },
});

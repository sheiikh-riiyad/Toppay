import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/toppay';

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'en' ? 'bn' : 'en';
    i18n.changeLanguage(newLanguage);
  };

  const isEnglish = i18n.language === 'en';

  return (
    <Pressable style={styles.container} onPress={toggleLanguage} accessibilityRole="button">
      <View style={styles.iconContainer}>
        <MaterialIcons
          name="language"
          size={20}
          color={palette.primary}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>{t('common.switchLanguage')}</Text>
        <Text style={styles.currentLanguage}>
          {isEnglish ? t('common.bangla') : t('common.english')}
        </Text>
      </View>
      <View style={styles.toggleContainer}>
        <View style={[styles.toggleTrack, !isEnglish && styles.toggleTrackActive]}>
          <View style={[styles.toggleThumb, !isEnglish && styles.toggleThumbActive]} />
        </View>
        <Text style={styles.toggleLabel}>
          {isEnglish ? 'EN' : 'বাং'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softGreen,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 2,
  },
  currentLanguage: {
    fontSize: 12,
    color: palette.muted,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: palette.primary,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.surface,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 16 }],
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: palette.primary,
    minWidth: 24,
    textAlign: 'center',
  },
});
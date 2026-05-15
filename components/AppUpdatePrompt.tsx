import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/toppay';
import { checkForAppUpdate, type AppUpdate } from '@/services/app-update';

export function AppUpdatePrompt() {
  const { t } = useTranslation();
  const checkedRef = useRef(false);
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (checkedRef.current) {
      return undefined;
    }

    checkedRef.current = true;

    checkForAppUpdate()
      .then((nextUpdate) => {
        if (isMounted) {
          setUpdate(nextUpdate);
        }
      })
      .catch((error) => {
        console.warn('App update check failed:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleUpdateNow() {
    if (!update) {
      return;
    }

    setIsOpening(true);

    try {
      await Linking.openURL(update.downloadUrl);
    } finally {
      setIsOpening(false);
    }
  }

  const visible = Boolean(update) && !isDismissed;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="system-update-alt" size={30} color={palette.surface} />
          </View>

          <Text style={styles.title}>{t('appUpdate.title')}</Text>
          <Text style={styles.body}>{t('appUpdate.body')}</Text>

          {update ? (
            <View style={styles.versionBox}>
              <Text style={styles.versionText}>
                {t('appUpdate.versionLine', {
                  current: update.currentVersion,
                  latest: update.latestVersion,
                })}
              </Text>
              {update.assetName ? <Text style={styles.assetText}>{update.assetName}</Text> : null}
            </View>
          ) : null}

          {update?.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>{t('appUpdate.notesTitle')}</Text>
              <Text style={styles.notesText} numberOfLines={4}>{update.notes}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setIsDismissed(true)}
              accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>{t('appUpdate.later')}</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              disabled={isOpening}
              onPress={handleUpdateNow}
              accessibilityRole="button">
              <MaterialIcons name="download" size={18} color={palette.surface} />
              <Text style={styles.primaryButtonText}>
                {isOpening ? t('appUpdate.opening') : t('appUpdate.updateNow')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23, 35, 31, 0.52)',
    padding: 22,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    gap: 14,
    borderRadius: 8,
    backgroundColor: palette.surface,
    padding: 20,
  },
  iconWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: palette.primary,
  },
  title: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  body: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  versionBox: {
    gap: 5,
    borderRadius: 8,
    backgroundColor: palette.surfaceAlt,
    padding: 12,
  },
  versionText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  assetText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  notesBox: {
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  notesTitle: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  notesText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    flex: 1.35,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: palette.primary,
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 14,
    fontWeight: '900',
  },
});

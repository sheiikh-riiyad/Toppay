import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/toppay';
import { checkForAppUpdate, type AppUpdate } from '@/services/app-update';

const APK_MIME_TYPE = 'application/vnd.android.package-archive';
const ANDROID_VIEW_ACTION = 'android.intent.action.VIEW';
const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 268435456;

type UpdateStage = 'idle' | 'downloading' | 'installing' | 'opening';

function getSafeApkFileName(update: AppUpdate) {
  const rawName = update.assetName || `Toppay-v${update.latestVersion}.apk`;
  const fileName = rawName.toLowerCase().endsWith('.apk') ? rawName : `${rawName}.apk`;

  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function AppUpdatePrompt() {
  const { t } = useTranslation();
  const checkedRef = useRef(false);
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [updateStage, setUpdateStage] = useState<UpdateStage>('idle');
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState('');

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

    setDownloadError('');
    setDownloadProgress(0);
    setUpdateStage('downloading');

    try {
      if (Platform.OS !== 'android' || !update.downloadUrl.toLowerCase().includes('.apk')) {
        setUpdateStage('opening');
        await Linking.openURL(update.downloadUrl);
        return;
      }

      const cacheDirectory = FileSystem.cacheDirectory;

      if (!cacheDirectory) {
        throw new Error('File system cache directory is not available.');
      }

      const apkUri = `${cacheDirectory}${getSafeApkFileName(update)}`;
      const download = FileSystem.createDownloadResumable(
        update.downloadUrl,
        apkUri,
        {},
        ({ totalBytesExpectedToWrite, totalBytesWritten }) => {
          if (totalBytesExpectedToWrite > 0) {
            setDownloadProgress(Math.min(totalBytesWritten / totalBytesExpectedToWrite, 1));
          }
        },
      );
      const result = await download.downloadAsync();

      if (!result?.uri) {
        throw new Error('APK download did not return a local file URI.');
      }

      setDownloadProgress(1);
      setUpdateStage('installing');

      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync(ANDROID_VIEW_ACTION, {
        data: contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
        type: APK_MIME_TYPE,
      });
    } catch (error) {
      console.warn('App update download failed:', error);
      setDownloadError(t('appUpdate.downloadFailed'));
      setUpdateStage('opening');
      try {
        await Linking.openURL(update.downloadUrl);
      } catch (openError) {
        console.warn('App update fallback link failed:', openError);
      }
    } finally {
      setDownloadProgress(null);
      setUpdateStage('idle');
    }
  }

  const visible = Boolean(update) && !isDismissed;
  const isUpdating = updateStage !== 'idle';
  const downloadPercent = Math.max(0, Math.min(Math.round((downloadProgress ?? 0) * 100), 100));
  const updateButtonLabel = updateStage === 'downloading'
    ? t('appUpdate.downloading', { percent: downloadPercent })
    : updateStage === 'installing'
      ? t('appUpdate.installing')
      : updateStage === 'opening'
        ? t('appUpdate.opening')
        : t('appUpdate.updateNow');

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

          {downloadProgress !== null ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${downloadPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {t('appUpdate.downloadProgress', { percent: downloadPercent })}
              </Text>
            </View>
          ) : null}

          {downloadError ? <Text style={styles.errorText}>{downloadError}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.secondaryButton, isUpdating && styles.disabledButton]}
              disabled={isUpdating}
              onPress={() => setIsDismissed(true)}
              accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>{t('appUpdate.later')}</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, isUpdating && styles.disabledButton]}
              disabled={isUpdating}
              onPress={handleUpdateNow}
              accessibilityRole="button">
              <MaterialIcons name="download" size={18} color={palette.surface} />
              <Text style={styles.primaryButtonText}>{updateButtonLabel}</Text>
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
  progressWrap: {
    gap: 7,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: palette.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: palette.primary,
  },
  progressText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    color: palette.danger,
    fontSize: 12,
    fontWeight: '800',
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
  disabledButton: {
    opacity: 0.68,
  },
  primaryButtonText: {
    flexShrink: 1,
    color: palette.surface,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
});

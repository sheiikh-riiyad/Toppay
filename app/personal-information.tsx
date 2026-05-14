import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, type WalletIconName } from '@/constants/toppay';
import { useAuth } from '@/contexts/auth';
import {
  listenPersonalInfo,
  savePersonalInfo,
  type PersonalInfoData,
} from '@/services/personal-info';

function makeEmptyPersonalInfo(fullName = ''): PersonalInfoData {
  return {
    fullName,
    fatherName: '',
    address: '',
    zipCode: '',
    documentType: 'nid',
  };
}

export default function PersonalInformationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { account } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(account?.uid));
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<PersonalInfoData>(() => makeEmptyPersonalInfo(account?.name));

  useEffect(() => {
    if (!account?.uid) {
      setFormData(makeEmptyPersonalInfo());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = listenPersonalInfo(account.uid, (info) => {
      setFormData({
        ...makeEmptyPersonalInfo(account.name),
        ...(info ?? {}),
      });
      setIsLoading(false);
    }, () => {
      setFormData(makeEmptyPersonalInfo(account.name));
      setIsLoading(false);
    });

    return unsubscribe;
  }, [account?.name, account?.uid]);

  const hasCompleteData = !!(
    formData.fullName &&
    formData.fatherName &&
    formData.address &&
    formData.zipCode &&
    ((formData.documentType === 'nid' && formData.nidFrontPhoto && formData.nidBackPhoto) ||
     (formData.documentType === 'passport' && formData.passportFrontPhoto && formData.passportBackPhoto))
  );

  async function pickImage(type: 'nidFront' | 'nidBack' | 'passportFront' | 'passportBack') {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        setFormData(prev => ({
          ...prev,
          [type === 'nidFront' ? 'nidFrontPhoto' :
           type === 'nidBack' ? 'nidBackPhoto' :
           type === 'passportFront' ? 'passportFrontPhoto' : 'passportBackPhoto']: uri,
        }));
      }
    } catch {
      Alert.alert(t('common.error'), t('personalInfoPage.pickImageFailed'));
    }
  }

  async function handleSave() {
    if (!account?.uid || isSaving) {
      return;
    }

    if (!formData.fullName || !formData.fatherName || !formData.address || !formData.zipCode) {
      Alert.alert(t('common.error'), t('personalInfo.fillRequiredFields'));
      return;
    }

    if (formData.documentType === 'nid' && (!formData.nidFrontPhoto || !formData.nidBackPhoto)) {
      Alert.alert(t('common.error'), t('personalInfo.uploadBothSides', { type: 'NID' }));
      return;
    }

    if (formData.documentType === 'passport' && (!formData.passportFrontPhoto || !formData.passportBackPhoto)) {
      Alert.alert(t('common.error'), t('personalInfo.uploadBothSides', { type: t('personalInfo.passport').toLowerCase() }));
      return;
    }

    setIsSaving(true);

    try {
      await savePersonalInfo(account.uid, formData);
      Alert.alert(t('personalInfoPage.saveSuccessTitle'), t('personalInfo.infoSaved'), [
        { text: t('common.ok'), onPress: () => setIsEditing(false) },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('personalInfoPage.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{t('personalInfoPage.kicker')}</Text>
            <Text style={styles.title}>{t('personalInfo.title')}</Text>
          </View>
          {hasCompleteData && (
            <Pressable
              style={styles.editButton}
              disabled={isSaving}
              onPress={() => setIsEditing(!isEditing)}
              accessibilityRole="button">
              <MaterialIcons name={isEditing ? "close" : "edit"} size={22} color={palette.primary} />
            </Pressable>
          )}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="account-circle" size={28} color={palette.surface} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{t('personalInfoPage.displayTitle')}</Text>
            <Text style={styles.heroMeta}>
              {hasCompleteData ? t('personalInfo.completeProfile') : t('personalInfo.completeYourProfile')}
            </Text>
          </View>
          {hasCompleteData && (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={16} color={palette.primary} />
            </View>
          )}
        </View>

        {hasCompleteData && !isEditing ? (
          // Display mode
          <View style={styles.infoDisplay}>
            <InfoRow icon="person" label={t('personalInfo.fullName')} value={formData.fullName} />
            <InfoRow icon="family-restroom" label={t('personalInfo.fatherName')} value={formData.fatherName} />
            <InfoRow icon="location-on" label={t('personalInfo.address')} value={formData.address} />
            <InfoRow icon="local-post-office" label={t('personalInfo.zipCode')} value={formData.zipCode} />
            <InfoRow
              icon="badge"
              label={t('personalInfo.documentType')}
              value={formData.documentType === 'nid' ? t('personalInfo.nationalId') : t('personalInfo.passport')}
            />

            <View style={styles.documentSection}>
              <Text style={styles.documentTitle}>
                {formData.documentType === 'nid' ? t('personalInfoPage.nidPhotos') : t('personalInfoPage.passportPhotos')}
              </Text>
              <View style={styles.photoGrid}>
                <DocumentPhoto
                  label={formData.documentType === 'nid' ? t('personalInfo.frontSide') : t('personalInfo.photoPage')}
                  uri={formData.documentType === 'nid' ? formData.nidFrontPhoto : formData.passportFrontPhoto}
                />
                <DocumentPhoto
                  label={t('personalInfo.backSide')}
                  uri={formData.documentType === 'nid' ? formData.nidBackPhoto : formData.passportBackPhoto}
                />
              </View>
            </View>
          </View>
        ) : (
          // Edit mode
          <View style={styles.formContainer}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>{t('personalInfo.basicInfo')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('personalInfoPage.fullNameRequired')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
                  placeholder={t('personalInfo.enterFullName')}
                  placeholderTextColor={palette.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('personalInfoPage.fatherNameRequired')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.fatherName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, fatherName: text }))}
                  placeholder={t('personalInfo.enterFatherName')}
                  placeholderTextColor={palette.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('personalInfoPage.addressRequired')}</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={formData.address}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                  placeholder={t('personalInfo.enterAddress')}
                  placeholderTextColor={palette.muted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('personalInfoPage.zipCodeRequired')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.zipCode}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, zipCode: text }))}
                  placeholder={t('personalInfo.enterZipCode')}
                  placeholderTextColor={palette.muted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>{t('personalInfo.documentVerification')}</Text>

              <View style={styles.documentTypeSelector}>
                <Pressable
                  style={[
                    styles.documentTypeButton,
                    formData.documentType === 'nid' && styles.documentTypeButtonActive,
                  ]}
                  disabled={isSaving}
                  onPress={() => setFormData(prev => ({ ...prev, documentType: 'nid' }))}>
                  <MaterialIcons
                    name="badge"
                    size={20}
                    color={formData.documentType === 'nid' ? palette.surface : palette.primary}
                  />
                  <Text style={[
                    styles.documentTypeText,
                    formData.documentType === 'nid' && styles.documentTypeTextActive,
                  ]}>
                    {t('personalInfo.nationalId')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.documentTypeButton,
                    formData.documentType === 'passport' && styles.documentTypeButtonActive,
                  ]}
                  disabled={isSaving}
                  onPress={() => setFormData(prev => ({ ...prev, documentType: 'passport' }))}>
                  <MaterialIcons
                    name="flight"
                    size={20}
                    color={formData.documentType === 'passport' ? palette.surface : palette.primary}
                  />
                  <Text style={[
                    styles.documentTypeText,
                    formData.documentType === 'passport' && styles.documentTypeTextActive,
                  ]}>
                    {t('personalInfo.passport')}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.photoInstruction}>
                {t('personalInfo.uploadPhotos', {
                  type: formData.documentType === 'nid' ? 'NID' : t('personalInfo.passport').toLowerCase(),
                })}
              </Text>

              <View style={styles.photoGrid}>
                <PhotoUploadButton
                  label={formData.documentType === 'nid' ? t('personalInfo.frontSide') : t('personalInfo.photoPage')}
                  onPress={() => pickImage(formData.documentType === 'nid' ? 'nidFront' : 'passportFront')}
                  uri={formData.documentType === 'nid' ? formData.nidFrontPhoto : formData.passportFrontPhoto}
                />
                <PhotoUploadButton
                  label={t('personalInfo.backSide')}
                  onPress={() => pickImage(formData.documentType === 'nid' ? 'nidBack' : 'passportBack')}
                  uri={formData.documentType === 'nid' ? formData.nidBackPhoto : formData.passportBackPhoto}
                />
              </View>
            </View>

            <Pressable
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              disabled={isSaving}
              onPress={handleSave}
              accessibilityRole="button">
              <MaterialIcons name="save" size={20} color={palette.surface} />
              <Text style={styles.saveButtonText}>
                {isSaving ? t('common.loading') : t('personalInfo.saveInfo')}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: WalletIconName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <MaterialIcons name={icon} size={20} color={palette.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function DocumentPhoto({ label, uri }: { label: string; uri?: string }) {
  return (
    <View style={styles.documentPhoto}>
      <Text style={styles.photoLabel}>{label}</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.photoImage} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <MaterialIcons name="image" size={24} color={palette.muted} />
        </View>
      )}
    </View>
  );
}

function PhotoUploadButton({
  label,
  onPress,
  uri,
}: {
  label: string;
  onPress: () => void;
  uri?: string;
}) {
  const { t } = useTranslation();

  return (
    <Pressable style={styles.photoUploadButton} onPress={onPress} accessibilityRole="button">
      <Text style={styles.photoLabel}>{label}</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.photoImage} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <MaterialIcons name="add-photo-alternate" size={24} color={palette.primary} />
          <Text style={styles.uploadText}>{t('generic.upload')}</Text>
        </View>
      )}
    </Pressable>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 15,
    fontWeight: '900',
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
  editButton: {
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
  verifiedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  infoDisplay: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softGreen,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  infoValue: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  documentSection: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12,
  },
  documentTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  photoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  documentPhoto: {
    flex: 1,
    gap: 8,
  },
  photoLabel: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  photoImage: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    backgroundColor: palette.softNeutral,
  },
  photoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.softNeutral,
    borderWidth: 1,
    borderColor: palette.border,
    borderStyle: 'dashed',
  },
  formContainer: {
    gap: 20,
  },
  formSection: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.background,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  documentTypeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  documentTypeButton: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 6,
    backgroundColor: palette.surface,
  },
  documentTypeButtonActive: {
    backgroundColor: palette.primary,
  },
  documentTypeText: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  documentTypeTextActive: {
    color: palette.surface,
  },
  photoInstruction: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  photoUploadButton: {
    flex: 1,
    gap: 8,
  },
  uploadText: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  saveButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.primary,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: palette.surface,
    fontSize: 16,
    fontWeight: '900',
  },
});

import { formatCurrency, palette, type AddBalanceMethod } from '@/constants/toppay';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import WalletMiniLogo from '@/components/WalletMiniLogo';

interface AddBalanceConfirmationModalProps {
  visible: boolean;
  selectedMethod: AddBalanceMethod;
  amount: number;
  trxId: string;
  proofImageUri?: string;
  proofFileName?: string;
  isSubmitting?: boolean;
  onConfirm: () => void | Promise<void>;
  onEdit: () => void;
}

export function AddBalanceConfirmationModal({
  visible,
  selectedMethod,
  amount,
  trxId,
  proofImageUri,
  proofFileName,
  isSubmitting,
  onConfirm,
  onEdit,
}: AddBalanceConfirmationModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('addBalancePage.confirmTitle')}</Text>
              <Text style={styles.subtitle}>{t('addBalancePage.confirmSubtitle')}</Text>
            </View>

            <View style={styles.reviewCard}>
              <View style={styles.reviewSection}>
                <Text style={styles.sectionLabel}>{t('generic.paymentMethod')}</Text>
                <View style={styles.methodRow}>
                  <WalletMiniLogo
                    color={selectedMethod.color}
                    mark={selectedMethod.mark}
                    name={selectedMethod.name}
                    size={48}
                  />
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{selectedMethod.name}</Text>
                    <Text style={styles.methodType}>{t(selectedMethod.type === 'Mobile wallet' ? 'methodTypes.mobileWallet' : 'methodTypes.bankAccount')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.reviewSection}>
                <Text style={styles.sectionLabel}>{t('generic.amount')}</Text>
                <Text style={styles.amountText}>{formatCurrency(amount)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.reviewSection}>
                <Text style={styles.sectionLabel}>{t('generic.transactionReference')}</Text>
                {trxId ? (
                  <Text style={styles.trxIdText}>{trxId}</Text>
                ) : (
                  <Text style={styles.notProvidedText}>{t('generic.notProvided')}</Text>
                )}
              </View>

              {proofImageUri && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.reviewSection}>
                    <Text style={styles.sectionLabel}>{t('generic.paymentProof')}</Text>
                    <Image
                      source={{ uri: proofImageUri }}
                      style={styles.proofImage}
                      resizeMode="contain"
                    />
                    {proofFileName && (
                      <Text style={styles.proofFileNameText}>{proofFileName}</Text>
                    )}
                  </View>
                </>
              )}
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons name="info" size={20} color={palette.amber} />
              <Text style={styles.infoText}>
                {t('addBalancePage.confirmInfo')}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.secondaryButton, isSubmitting && styles.disabledButton]}
                onPress={onEdit}
                disabled={isSubmitting}
                accessibilityRole="button">
                <MaterialIcons name="edit" size={18} color={palette.primary} />
                <Text style={styles.secondaryButtonText}>{t('generic.edit')}</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
                onPress={onConfirm}
                disabled={isSubmitting}
                accessibilityRole="button">
                <MaterialIcons name="check-circle" size={18} color={palette.surface} />
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? t('common.loading') : t('generic.confirmAndSubmit')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: palette.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
  },
  reviewSection: {
    gap: 8,
  },
  sectionLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  methodType: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
  },
  amountText: {
    color: palette.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  trxIdText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  notProvidedText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  proofFileNameText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: palette.softAmber,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    color: palette.ink,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: palette.surface,
    fontSize: 15,
    fontWeight: '800',
  },
});

/**
 * Payment Method Selection Modal
 *
 * Allows users to choose between EOA and Smart Account
 * when initiating a payment
 */

import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { WalletType } from "./WalletTypeSelector";

interface PaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (method: WalletType) => void;
  smartAccountAvailable: boolean;
}

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  visible,
  onClose,
  onSelect,
  smartAccountAvailable,
}) => {
  const handleSelect = (method: WalletType) => {
    onSelect(method);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={styles.modalContainer}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Choose Payment Method</Text>
            <Text style={styles.subtitle}>
              Select how you want to send this payment
            </Text>
          </View>

          {/* EOA Option */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleSelect("eoa")}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, styles.eoaIcon]}>
              <MaterialCommunityIcons
                name="wallet"
                size={28}
                color={palette.primaryBlue}
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>EOA Wallet</Text>
              <Text style={styles.optionDescription}>
                Traditional wallet • Requires ETH for gas fees
              </Text>
              <View style={styles.featureList}>
                <View style={styles.feature}>
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={palette.neutralMid}
                  />
                  <Text style={styles.featureText}>Standard transaction</Text>
                </View>
                <View style={styles.feature}>
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={palette.neutralMid}
                  />
                  <Text style={styles.featureText}>
                    Direct from your wallet
                  </Text>
                </View>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={palette.neutralMid}
            />
          </TouchableOpacity>

          {/* Smart Account Option */}
          <TouchableOpacity
            style={[
              styles.option,
              !smartAccountAvailable && styles.optionDisabled,
            ]}
            onPress={() => smartAccountAvailable && handleSelect("smart")}
            disabled={!smartAccountAvailable}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, styles.smartIcon]}>
              <MaterialCommunityIcons
                name="shield-account"
                size={28}
                color={
                  smartAccountAvailable
                    ? palette.successGreen
                    : palette.neutralLight
                }
              />
            </View>
            <View style={styles.optionContent}>
              <View style={styles.optionTitleRow}>
                <Text
                  style={[
                    styles.optionTitle,
                    !smartAccountAvailable && styles.optionTitleDisabled,
                  ]}
                >
                  Smart Account
                </Text>
                {smartAccountAvailable && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>✨ Recommended</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.optionDescription,
                  !smartAccountAvailable && styles.optionDescriptionDisabled,
                ]}
              >
                {smartAccountAvailable
                  ? "Account Abstraction • Gasless transactions"
                  : "Not available - Initialize first"}
              </Text>
              {smartAccountAvailable && (
                <View style={styles.featureList}>
                  <View style={styles.feature}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={14}
                      color={palette.successGreen}
                    />
                    <Text style={styles.featureTextHighlight}>
                      Sponsored gas (free transactions)
                    </Text>
                  </View>
                  <View style={styles.feature}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={14}
                      color={palette.successGreen}
                    />
                    <Text style={styles.featureTextHighlight}>
                      Batch multiple operations
                    </Text>
                  </View>
                  <View style={styles.feature}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={14}
                      color={palette.successGreen}
                    />
                    <Text style={styles.featureTextHighlight}>
                      Pay gas with tokens
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={
                smartAccountAvailable
                  ? palette.neutralMid
                  : palette.neutralLight
              }
            />
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: palette.white,
    borderRadius: 20,
    width: "100%",
    maxWidth: 450,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.neutralDark,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: palette.neutralMid,
    textAlign: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: 16,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  eoaIcon: {
    backgroundColor: palette.primaryBlue + "15",
  },
  smartIcon: {
    backgroundColor: palette.successGreen + "15",
  },
  optionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  optionTitleDisabled: {
    color: palette.neutralMid,
  },
  recommendedBadge: {
    backgroundColor: palette.successGreen + "20",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: "600",
    color: palette.successGreen,
  },
  optionDescription: {
    fontSize: 14,
    color: palette.neutralMid,
    marginBottom: spacing.xs,
  },
  optionDescriptionDisabled: {
    color: palette.neutralLight,
  },
  featureList: {
    gap: spacing.xs,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  featureText: {
    fontSize: 13,
    color: palette.neutralMid,
  },
  featureTextHighlight: {
    fontSize: 13,
    color: palette.successGreen,
    fontWeight: "500",
  },
  cancelButton: {
    marginTop: spacing.sm,
    padding: spacing.md,
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralMid,
  },
});

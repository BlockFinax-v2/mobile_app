import React, { useState } from "react";
import { View, StyleSheet, Switch, Text, Alert } from "react-native";
import { useSmartAccountProvider } from "@/hooks";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

/**
 * Smart Account Payment Options
 *
 * UI component to show smart account features for payments:
 * - Gasless transaction toggle
 * - Smart account status
 * - Batch transaction support
 * 
 * ✅ Phase 3 Migration: Now uses unified hook that switches between Pimlico/Alchemy
 */

interface SmartAccountPaymentOptionsProps {
  onGaslessChange?: (enabled: boolean) => void;
  gaslessEnabled?: boolean;
  showBatchOption?: boolean;
  onBatchChange?: (enabled: boolean) => void;
  batchEnabled?: boolean;
}

export const SmartAccountPaymentOptions: React.FC<
  SmartAccountPaymentOptionsProps
> = ({
  onGaslessChange,
  gaslessEnabled = false,
  showBatchOption = false,
  onBatchChange,
  batchEnabled = false,
}) => {
  const { 
    isInitialized, 
    smartAccountAddress, 
    isDeployed
  } = useSmartAccountProvider('SmartAccountPaymentOptions');

  if (!isInitialized) {
    return null; // Don't show if smart accounts are not available
  }

  return (
    <View style={styles.container}>
      {/* Smart Account Info */}
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="shield-account"
          size={20}
          color={palette.primaryBlue}
        />
        <Text style={styles.headerText}>Smart Account Features</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ENABLED</Text>
        </View>
      </View>

      {smartAccountAddress && (
        <View style={styles.accountInfo}>
          <Text style={styles.infoLabel}>Smart Account Address:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {smartAccountAddress}
          </Text>
          <Text style={styles.infoStatus}>
            {isDeployed
              ? "✓ Deployed"
              : "⚠ Will deploy on first transaction"}
          </Text>
        </View>
      )}

      {/* Gasless Transaction Option */}
      <View style={styles.option}>
        <View style={styles.optionLeft}>
          <MaterialCommunityIcons
            name="gas-station-off"
            size={24}
            color={gaslessEnabled ? palette.accentGreen : palette.neutralMid}
          />
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Gasless Transaction</Text>
            <Text style={styles.optionDescription}>
              No gas fees required - sponsored by paymaster
            </Text>
          </View>
        </View>
        <Switch
          value={gaslessEnabled}
          onValueChange={(value) => {
            onGaslessChange?.(value);
            if (value) {
              Alert.alert(
                "Gasless Transaction Enabled",
                "This transaction will be sponsored by the paymaster. You won't pay any gas fees!",
                [{ text: "OK" }]
              );
            }
          }}
          trackColor={{
            false: palette.neutralLight,
            true: palette.accentGreen + "50",
          }}
          thumbColor={gaslessEnabled ? palette.accentGreen : palette.white}
        />
      </View>

      {/* Batch Transaction Option (optional) */}
      {showBatchOption && (
        <View style={styles.option}>
          <View style={styles.optionLeft}>
            <MaterialCommunityIcons
              name="layers"
              size={24}
              color={batchEnabled ? palette.primaryBlue : palette.neutralMid}
            />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Batch Transaction</Text>
              <Text style={styles.optionDescription}>
                Combine multiple operations in one
              </Text>
            </View>
          </View>
          <Switch
            value={batchEnabled}
            onValueChange={onBatchChange}
            trackColor={{
              false: palette.neutralLight,
              true: palette.primaryBlue + "50",
            }}
            thumbColor={batchEnabled ? palette.primaryBlue : palette.white}
          />
        </View>
      )}

      {/* Benefits Info */}
      <View style={styles.benefitsCard}>
        <Text style={styles.benefitsTitle}>Smart Account Benefits:</Text>
        <View style={styles.benefitItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={16}
            color={palette.accentGreen}
          />
          <Text style={styles.benefitText}>No gas fees with sponsorship</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={16}
            color={palette.accentGreen}
          />
          <Text style={styles.benefitText}>Batch multiple transactions</Text>
        </View>
        <View style={styles.benefitItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={16}
            color={palette.accentGreen}
          />
          <Text style={styles.benefitText}>Enhanced security features</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: "#EEF2FF",
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    flex: 1,
  },
  badge: {
    backgroundColor: palette.accentGreen + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.accentGreen,
  },
  accountInfo: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: palette.neutralMid,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.neutralDark,
    fontFamily: "monospace",
  },
  infoStatus: {
    fontSize: 11,
    color: palette.neutralMid,
    marginTop: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLighter,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  optionDescription: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  benefitsCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.primaryBlue,
    marginBottom: 4,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  benefitText: {
    fontSize: 12,
    color: palette.neutralDark,
  },
});

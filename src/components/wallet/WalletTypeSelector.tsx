/**
 * Wallet Type Selector Component
 *
 * Allows users to switch between EOA and Smart Account
 * with visual feedback and balance display
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export type WalletType = "eoa" | "smart";

interface WalletTypeSelectorProps {
  selectedType: WalletType;
  onSelect: (type: WalletType) => void;
  eoaAddress: string;
  smartAccountAddress?: string;
  showAddresses?: boolean;
  disabled?: boolean;
  style?: any;
}

export const WalletTypeSelector: React.FC<WalletTypeSelectorProps> = ({
  selectedType,
  onSelect,
  eoaAddress,
  smartAccountAddress,
  showAddresses = true,
  disabled = false,
  style,
}) => {
  const slideAnim = React.useRef(
    new Animated.Value(selectedType === "eoa" ? 0 : 1)
  ).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedType === "eoa" ? 0 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [selectedType]);

  const handleSelect = (type: WalletType) => {
    if (!disabled) {
      onSelect(type);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Calculate slide percentage based on container width
  const getSlideTransform = () => {
    return slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0%", "100%"],
    });
  };

  return (
    <View style={[styles.container, style]}>
      {/* Compact Address Display (when addresses hidden) */}
      {!showAddresses && (
        <TouchableOpacity
          style={styles.compactAddressDisplay}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={selectedType === "eoa" ? "wallet" : "shield-account"}
            size={16}
            color={palette.primaryBlue}
          />
          <Text style={styles.compactAddressText}>
            {selectedType === "eoa"
              ? formatAddress(eoaAddress)
              : smartAccountAddress
              ? formatAddress(smartAccountAddress)
              : formatAddress(eoaAddress)}
          </Text>
          <MaterialCommunityIcons
            name="chevron-down"
            size={16}
            color={palette.neutralMid}
          />
        </TouchableOpacity>
      )}

      {/* Toggle Slider */}
      <View style={styles.toggleContainer}>
        <View style={styles.sliderBackground}>
          <Animated.View
            style={[
              styles.sliderIndicator,
              {
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 164], // Approximate half width
                    }),
                  },
                ],
              },
            ]}
          />

          {/* EOA Option */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleSelect("eoa")}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="wallet"
              size={20}
              color={
                selectedType === "eoa" ? palette.white : palette.neutralMid
              }
            />
            <Text
              style={[
                styles.optionText,
                selectedType === "eoa" && styles.optionTextActive,
              ]}
            >
              EOA Wallet
            </Text>
          </TouchableOpacity>

          {/* Smart Account Option */}
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleSelect("smart")}
            disabled={disabled || !smartAccountAddress}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="shield-account"
              size={20}
              color={
                !smartAccountAddress
                  ? palette.neutralLight
                  : selectedType === "smart"
                  ? palette.white
                  : palette.neutralMid
              }
            />
            <Text
              style={[
                styles.optionText,
                selectedType === "smart" && styles.optionTextActive,
                !smartAccountAddress && styles.optionTextDisabled,
              ]}
            >
              Smart Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Address Display */}
      {showAddresses && (
        <View style={styles.addressContainer}>
          {selectedType === "eoa" ? (
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <MaterialCommunityIcons
                  name="wallet"
                  size={16}
                  color={palette.primaryBlue}
                />
                <Text style={styles.addressLabel}>EOA Address</Text>
              </View>
              <Text style={styles.addressText}>
                {formatAddress(eoaAddress)}
              </Text>
              <Text style={styles.addressSubtext}>
                Traditional wallet - requires ETH for gas
              </Text>
            </View>
          ) : smartAccountAddress ? (
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <MaterialCommunityIcons
                  name="shield-account"
                  size={16}
                  color={palette.primaryBlue}
                />
                <Text style={styles.addressLabel}>Smart Account Address</Text>
              </View>
              <Text style={styles.addressText}>
                {formatAddress(smartAccountAddress)}
              </Text>
              <Text style={styles.addressSubtext}>
                ✨ Gasless transactions • Batch operations
              </Text>
            </View>
          ) : (
            <View style={styles.addressCard}>
              <Text style={styles.noSmartAccountText}>
                Smart Account not available
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  compactAddressDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  compactAddressText: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    flex: 1,
  },
  toggleContainer: {
    position: "relative",
    height: 56,
  },
  sliderBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 4,
  },
  sliderIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    width: "48%",
    height: 48,
    backgroundColor: palette.primaryBlue,
    borderRadius: 8,
    shadowColor: palette.primaryBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  option: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: 8,
    zIndex: 1,
  },
  optionActive: {
    // Style handled by indicator
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralMid,
  },
  optionTextActive: {
    color: palette.white,
  },
  optionTextDisabled: {
    color: palette.neutralLight,
  },
  addressContainer: {
    marginTop: spacing.sm,
  },
  addressCard: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.neutralMid,
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    fontFamily: "monospace",
    marginBottom: spacing.xs,
  },
  addressSubtext: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  noSmartAccountText: {
    fontSize: 14,
    color: palette.neutralMid,
    textAlign: "center",
  },
});

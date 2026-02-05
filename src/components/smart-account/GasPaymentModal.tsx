import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { gaslessLimitService } from "@/services/gaslessLimitService";
import { tokenPriceService } from "@/services/tokenPriceService";
import { Storage } from "@/utils/storage";

export type GasPaymentOption = "gasless" | "token" | "native";

interface GasPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: GasPaymentOption, doNotAskAgain: boolean) => void;
  transactionAmount: number;
  tokenSymbol: string;
}

const DO_NOT_ASK_KEY = "blockfinax.gasPayment.doNotAskAgain";

export const GasPaymentModal: React.FC<GasPaymentModalProps> = ({
  visible,
  onClose,
  onSelect,
  transactionAmount,
  tokenSymbol,
}) => {
  const [selectedOption, setSelectedOption] =
    useState<GasPaymentOption>("gasless");
  const [doNotAskAgain, setDoNotAskAgain] = useState(false);
  const [gaslessInfo, setGaslessInfo] = useState({
    remainingUSD: 0,
    limitUSD: 0.5,
    canUseGasless: false,
  });

  useEffect(() => {
    if (visible) {
      loadGaslessInfo();
    }
  }, [visible, transactionAmount, tokenSymbol]);

  const loadGaslessInfo = async () => {
    const amountUSD = tokenPriceService.convertToUSD(
      transactionAmount,
      tokenSymbol,
    );
    const result = await gaslessLimitService.canUseGasless(amountUSD);
    const summary = await gaslessLimitService.getUsageSummary();

    setGaslessInfo({
      remainingUSD: summary.remainingUSD,
      limitUSD: summary.limitUSD,
      canUseGasless: result.allowed,
    });

    // Default to gasless if available, otherwise token
    if (result.allowed) {
      setSelectedOption("gasless");
    } else {
      setSelectedOption("token");
    }
  };

  const handleConfirm = async () => {
    if (doNotAskAgain) {
      await Storage.setItem(DO_NOT_ASK_KEY, selectedOption);
    }
    onSelect(selectedOption, doNotAskAgain);
  };

  const handleCancel = () => {
    setDoNotAskAgain(false);
    setSelectedOption("gasless");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="gas-station"
              size={24}
              color={palette.primaryBlue}
            />
            <Text style={styles.title}>Choose Gas Payment Method</Text>
          </View>

          {/* Gasless Balance Info */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Daily Gasless Limit</Text>
            <Text style={styles.balanceAmount}>
              ${gaslessInfo.remainingUSD.toFixed(2)} / $
              {gaslessInfo.limitUSD.toFixed(2)}
            </Text>
            <Text style={styles.balanceSubtext}>
              {gaslessInfo.canUseGasless
                ? "✓ You can use gasless for this transaction"
                : "⚠ Transaction exceeds remaining gasless limit"}
            </Text>
          </View>

          {/* Payment Options */}
          <View style={styles.optionsContainer}>
            {/* Gasless Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === "gasless" && styles.optionCardSelected,
                !gaslessInfo.canUseGasless && styles.optionCardDisabled,
              ]}
              onPress={() =>
                gaslessInfo.canUseGasless && setSelectedOption("gasless")
              }
              disabled={!gaslessInfo.canUseGasless}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons
                    name="gift-outline"
                    size={24}
                    color={
                      !gaslessInfo.canUseGasless
                        ? palette.neutralMid
                        : selectedOption === "gasless"
                          ? palette.accentGreen
                          : palette.neutralDark
                    }
                  />
                  <View>
                    <Text
                      style={[
                        styles.optionTitle,
                        !gaslessInfo.canUseGasless &&
                          styles.optionTitleDisabled,
                      ]}
                    >
                      Gasless Transaction
                    </Text>
                    <Text style={styles.optionDescription}>
                      Free - No gas fees (uses daily limit)
                    </Text>
                  </View>
                </View>
                {selectedOption === "gasless" && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={palette.accentGreen}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Pay with Token Option (Default Recommended) */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === "token" && styles.optionCardSelected,
                styles.recommendedCard,
              ]}
              onPress={() => setSelectedOption("token")}
            >
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </View>
              <View style={styles.optionHeader}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={24}
                    color={
                      selectedOption === "token"
                        ? palette.primaryBlue
                        : palette.neutralDark
                    }
                  />
                  <View>
                    <Text style={styles.optionTitle}>
                      Pay Gas with {tokenSymbol}
                    </Text>
                    <Text style={styles.optionDescription}>
                      No native tokens needed - uses {tokenSymbol}
                    </Text>
                  </View>
                </View>
                {selectedOption === "token" && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={palette.primaryBlue}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Native Gas Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === "native" && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedOption("native")}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcons
                    name="gas-station"
                    size={24}
                    color={
                      selectedOption === "native"
                        ? palette.warningYellow
                        : palette.neutralDark
                    }
                  />
                  <View>
                    <Text style={styles.optionTitle}>
                      Pay with Native Currency
                    </Text>
                    <Text style={styles.optionDescription}>
                      Uses ETH, BNB, etc. for gas
                    </Text>
                  </View>
                </View>
                {selectedOption === "native" && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={palette.warningYellow}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Do Not Ask Again Checkbox */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setDoNotAskAgain(!doNotAskAgain)}
          >
            <MaterialCommunityIcons
              name={
                doNotAskAgain ? "checkbox-marked" : "checkbox-blank-outline"
              }
              size={24}
              color={doNotAskAgain ? palette.primaryBlue : palette.neutralMid}
            />
            <Text style={styles.checkboxLabel}>
              Don't ask again (use{" "}
              {selectedOption === "gasless"
                ? "gasless when available"
                : selectedOption === "token"
                  ? "token payment"
                  : "native gas"}{" "}
              by default)
            </Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const checkShouldShowGasModal = async (): Promise<boolean> => {
  try {
    const preference = await Storage.getItem(DO_NOT_ASK_KEY);
    return preference === null; // Show modal if no preference is set
  } catch {
    return true;
  }
};

export const getSavedGasPreference =
  async (): Promise<GasPaymentOption | null> => {
    try {
      const preference = await Storage.getItem(DO_NOT_ASK_KEY);
      return preference as GasPaymentOption | null;
    } catch {
      return null;
    }
  };

export const clearGasPreference = async (): Promise<void> => {
  try {
    await Storage.removeItem(DO_NOT_ASK_KEY);
  } catch (error) {
    console.error("Failed to clear gas preference:", error);
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: spacing.lg,
    width: "90%",
    maxWidth: 500,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.neutralDark,
    flex: 1,
  },
  balanceCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  balanceLabel: {
    fontSize: 12,
    color: palette.neutralMid,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.primaryBlue,
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  optionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: palette.primaryBlue,
    backgroundColor: palette.primaryBlue + "10",
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  recommendedCard: {
    position: "relative",
  },
  recommendedBadge: {
    position: "absolute",
    top: -8,
    right: 12,
    backgroundColor: palette.primaryBlue,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: "700",
    color: palette.white,
    letterSpacing: 0.5,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  optionTitleDisabled: {
    color: palette.neutralMid,
  },
  optionDescription: {
    fontSize: 11,
    color: palette.neutralMid,
    marginTop: 2,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  checkboxLabel: {
    fontSize: 12,
    color: palette.neutralDark,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: palette.primaryBlue,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.white,
  },
});

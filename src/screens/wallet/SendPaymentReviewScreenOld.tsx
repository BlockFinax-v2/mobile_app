import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { WalletStackParamList } from "@/navigation/types";
import { transactionService } from "@/services/transactionService";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type RouteProps = RouteProp<WalletStackParamList, "SendPaymentReview">;
type NavigationProps = StackNavigationProp<
  WalletStackParamList,
  "SendPaymentReview"
>;

export const SendPaymentReviewScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { selectedNetwork, refreshBalance } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [explorerUrl, setExplorerUrl] = useState<string>("");

  const details = route.params;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const result = await transactionService.sendTransaction({
        recipientAddress: details.recipient,
        amount: details.amount,
        tokenAddress:
          details.tokenAddress === "0x0000000000000000000000000000000000000000"
            ? undefined
            : details.tokenAddress,
        tokenDecimals: details.tokenDecimals,
        network: selectedNetwork,
      });

      setTransactionHash(result.hash);
      if (result.explorerUrl) {
        setExplorerUrl(result.explorerUrl);
      }
      setSuccess(true);

      // Wait for confirmation in background
      transactionService
        .waitForTransaction(result.hash, selectedNetwork, 1)
        .then(() => {
          console.log("Transaction confirmed!");
          // Refresh balance after confirmation
          refreshBalance();
        })
        .catch((error) => {
          console.error("Transaction confirmation error:", error);
        });

      // Navigate back after showing success
      setTimeout(() => navigation.popToTop(), 3000);
    } catch (error: any) {
      console.error("Transaction error:", error);
      Alert.alert(
        "Transaction Failed",
        error.message || "Failed to send transaction. Please try again.",
        [{ text: "OK", onPress: () => setIsProcessing(false) }]
      );
      setIsProcessing(false);
    }
  };

  const handleViewOnExplorer = () => {
    if (explorerUrl) {
      Linking.openURL(explorerUrl);
    }
  };

  if (success) {
    return (
      <Screen>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons
              name="check-circle"
              size={80}
              color={palette.accentGreen}
            />
          </View>
          <Text variant="title" style={styles.successTitle}>
            Transaction Sent!
          </Text>
          <Text color={palette.neutralMid} style={styles.successMessage}>
            Your payment has been successfully broadcasted to the network
          </Text>

          <View style={styles.successDetails}>
            <Text color={palette.neutralMid}>Amount Sent</Text>
            <Text variant="title" color={palette.primaryBlue}>
              {details.amount} {details.currency}
            </Text>

            {transactionHash && (
              <View style={styles.txHashContainer}>
                <Text color={palette.neutralMid} style={styles.txHashLabel}>
                  Transaction Hash
                </Text>
                <Text style={styles.txHash} numberOfLines={1}>
                  {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                </Text>
              </View>
            )}
          </View>

          {explorerUrl && (
            <TouchableOpacity
              style={styles.explorerButton}
              onPress={handleViewOnExplorer}
            >
              <MaterialCommunityIcons
                name="open-in-new"
                size={20}
                color={palette.primaryBlue}
              />
              <Text color={palette.primaryBlue} style={styles.explorerText}>
                View on Block Explorer
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Screen>
    );
  }

  if (isProcessing) {
    return (
      <Screen>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={palette.primaryBlue} />
          <Text variant="subtitle" style={styles.processingText}>
            Processing Transaction...
          </Text>
          <Text color={palette.neutralMid} style={styles.processingSubtext}>
            Please wait while we broadcast your transaction
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen preset="scroll">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="receipt-text-outline"
            size={24}
            color={palette.primaryBlue}
          />
          <View style={styles.headerText}>
            <Text variant="title">Review Transaction</Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Please verify all details before confirming
            </Text>
          </View>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text color={palette.neutralMid} style={styles.amountLabel}>
            You're Sending
          </Text>
          <Text style={styles.amountValue}>
            {details.amount} {details.currency}
          </Text>
          <Text color={palette.neutralMid} style={styles.amountNetwork}>
            on {details.network}
          </Text>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text variant="subtitle" style={styles.cardTitle}>
            Transaction Details
          </Text>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <MaterialCommunityIcons
                name="account-outline"
                size={20}
                color={palette.neutralMid}
              />
              <Text color={palette.neutralMid}>Recipient</Text>
            </View>
            <Text style={styles.detailValue} numberOfLines={1}>
              {details.recipient.slice(0, 6)}...{details.recipient.slice(-4)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <MaterialCommunityIcons
                name="web"
                size={20}
                color={palette.neutralMid}
              />
              <Text color={palette.neutralMid}>Network</Text>
            </View>
            <Text style={styles.detailValue}>{details.network}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <MaterialCommunityIcons
                name="cash"
                size={20}
                color={palette.neutralMid}
              />
              <Text color={palette.neutralMid}>Currency</Text>
            </View>
            <Text style={styles.detailValue}>{details.currency}</Text>
          </View>

          {details.message ? (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={20}
                  color={palette.neutralMid}
                />
                <Text color={palette.neutralMid}>Message</Text>
              </View>
              <Text style={styles.detailValue}>{details.message}</Text>
            </View>
          ) : null}
        </View>

        {/* Fee Breakdown */}
        <View style={styles.feeCard}>
          <View style={styles.feeRow}>
            <Text color={palette.neutralMid}>Transaction Amount</Text>
            <Text style={styles.feeValue}>
              {details.amount} {details.currency}
            </Text>
          </View>
          <View style={styles.feeRow}>
            <Text color={palette.neutralMid}>Network Fee (Est.)</Text>
            <Text style={styles.feeValue}>
              {details.fee.toFixed(6)} {selectedNetwork.primaryCurrency}
            </Text>
          </View>
          <Text style={styles.feeNote}>
            * Final gas fee may vary based on network conditions
          </Text>
        </View>

        {/* Warning */}
        <View style={styles.warning}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={20}
            color={palette.warningYellow}
          />
          <Text color={palette.neutralMid} style={styles.warningText}>
            Double-check the recipient address. Transactions cannot be reversed.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button label="Confirm & Send" onPress={handleConfirm} />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
  },
  amountCard: {
    backgroundColor: palette.primaryBlue,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  amountLabel: {
    color: palette.white,
    fontSize: 14,
    opacity: 0.8,
  },
  amountValue: {
    color: palette.white,
    fontSize: 36,
    fontWeight: "700",
  },
  amountNetwork: {
    color: palette.white,
    fontSize: 14,
    opacity: 0.8,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
    maxWidth: "50%",
    textAlign: "right",
  },
  feeCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  feeNote: {
    fontSize: 11,
    color: palette.neutralMid,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: "#D1D5DB",
    marginVertical: spacing.xs,
  },
  warning: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  warningText: {
    flex: 1,
    fontSize: 12,
  },
  actions: {
    gap: spacing.md,
  },
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  processingText: {
    marginTop: spacing.md,
  },
  processingSubtext: {
    textAlign: "center",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    textAlign: "center",
  },
  successMessage: {
    textAlign: "center",
    fontSize: 14,
  },
  successDetails: {
    backgroundColor: "#ECFDF3",
    borderRadius: 16,
    padding: spacing.lg,
    width: "100%",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  txHashContainer: {
    marginTop: spacing.md,
    width: "100%",
    alignItems: "center",
    gap: spacing.xs,
  },
  txHashLabel: {
    fontSize: 12,
  },
  txHash: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
    fontFamily: "monospace",
  },
  explorerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    marginTop: spacing.md,
  },
  explorerText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

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
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
  Vibration,
  Share,
  Clipboard,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type RouteProps = RouteProp<WalletStackParamList, "SendPaymentReview">;
type NavigationProps = StackNavigationProp<
  WalletStackParamList,
  "SendPaymentReview"
>;

interface TransactionStatus {
  status: "pending" | "confirming" | "confirmed" | "failed";
  confirmations: number;
  blockNumber?: number;
  message: string;
}

export const SendPaymentReviewScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { selectedNetwork, refreshBalance } = useWallet();
  
  // Transaction states
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [explorerUrl, setExplorerUrl] = useState<string>("");
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const details = route.params;

  // Animate status changes
  useEffect(() => {
    if (txStatus) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [txStatus]);

  // Pulse animation for pending states
  useEffect(() => {
    if (txStatus?.status === "pending" || txStatus?.status === "confirming") {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (txStatus?.status === "pending" || txStatus?.status === "confirming") {
            pulse();
          }
        });
      };
      pulse();
    }
  }, [txStatus?.status]);

  // Poll transaction status
  const pollTransactionStatus = async (hash: string) => {
    try {
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max polling
      
      const poll = async () => {
        try {
          const status = await transactionService.getTransactionStatus(hash, selectedNetwork);
          
          if (status.status === "pending") {
            setTxStatus({
              status: "pending",
              confirmations: 0,
              message: "Transaction submitted to network...",
            });
          } else if (status.status === "confirmed") {
            if (status.confirmations === 0) {
              setTxStatus({
                status: "confirming",
                confirmations: 0,
                blockNumber: status.blockNumber,
                message: "Transaction included in block, waiting for confirmations...",
              });
            } else {
              setTxStatus({
                status: "confirmed",
                confirmations: status.confirmations,
                blockNumber: status.blockNumber,
                message: `Transaction confirmed with ${status.confirmations} confirmations!`,
              });
              
              // Success haptic feedback
              Vibration.vibrate([100, 200, 100]);
              
              // Refresh balance after confirmation
              await refreshBalance();
              
              // Auto navigate back after 3 seconds
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "WalletHome" }],
                });
              }, 3000);
              return;
            }
          } else if (status.status === "failed") {
            setTxStatus({
              status: "failed",
              confirmations: 0,
              message: "Transaction failed. Please try again.",
            });
            Vibration.vibrate([200, 100, 200]);
            return;
          }

          attempts++;
          if (attempts < maxAttempts) {
            // Poll every 5 seconds
            setTimeout(poll, 5000);
          } else {
            setTxStatus({
              status: "pending",
              confirmations: 0,
              message: "Taking longer than expected. Check explorer for updates.",
            });
          }
        } catch (error) {
          console.error("Status polling error:", error);
          // Continue polling on error, just less frequently
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000);
          }
        }
      };

      // Start polling
      poll();
    } catch (error) {
      console.error("Failed to start transaction polling:", error);
    }
  };

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

      setIsProcessing(false);
      
      // Start polling transaction status
      pollTransactionStatus(result.hash);

    } catch (error: any) {
      console.error("Transaction error:", error);
      setIsProcessing(false);
      Vibration.vibrate([200, 100, 200]); // Error vibration
      
      Alert.alert(
        "Transaction Failed",
        error.message || "Failed to send transaction. Please try again.",
        [
          { text: "Retry", onPress: handleConfirm },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const handleViewOnExplorer = () => {
    if (explorerUrl) {
      Linking.openURL(explorerUrl);
    }
  };

  const handleCopyHash = () => {
    if (transactionHash) {
      Clipboard.setString(transactionHash);
      Vibration.vibrate(50);
      Alert.alert("✅ Copied!", "Transaction hash copied to clipboard");
    }
  };

  const handleShare = async () => {
    try {
      const message = `Transaction sent!\n\nAmount: ${details.amount} ${details.currency}\nNetwork: ${details.network}\nHash: ${transactionHash}\n\n${explorerUrl ? `View on Explorer: ${explorerUrl}` : ''}`;
      
      await Share.share({
        message,
        title: "Transaction Receipt",
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const getStatusIcon = () => {
    if (!txStatus) return null;
    
    switch (txStatus.status) {
      case "pending":
        return "clock-outline";
      case "confirming":
        return "check-circle-outline";
      case "confirmed":
        return "check-circle";
      case "failed":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const getStatusColor = () => {
    if (!txStatus) return palette.neutralMid;
    
    switch (txStatus.status) {
      case "pending":
        return palette.warningYellow;
      case "confirming":
        return palette.primaryBlue;
      case "confirmed":
        return palette.successGreen;
      case "failed":
        return palette.errorRed;
      default:
        return palette.neutralMid;
    }
  };

  // Show transaction status if hash exists
  if (transactionHash && txStatus) {
    return (
      <Screen>
        <View style={styles.statusContainer}>
          <Animated.View 
            style={[
              styles.statusIconContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { scale: pulseAnim },
                ],
              },
            ]}
          >
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor() + "20" }]}>
              <MaterialCommunityIcons
                name={getStatusIcon() as any}
                size={60}
                color={getStatusColor()}
              />
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.statusContent,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
            ]}
          >
            <Text variant="title" style={styles.statusTitle}>
              {txStatus.status === "confirmed" ? "✅ Success!" :
               txStatus.status === "failed" ? "❌ Failed" :
               txStatus.status === "confirming" ? "🔄 Confirming" :
               "⏳ Processing"}
            </Text>
            
            <Text style={styles.statusMessage}>{txStatus.message}</Text>

            {txStatus.confirmations > 0 && (
              <View style={styles.confirmationsContainer}>
                <MaterialCommunityIcons
                  name="check-all"
                  size={16}
                  color={palette.successGreen}
                />
                <Text style={styles.confirmationsText}>
                  {txStatus.confirmations} Confirmations
                </Text>
              </View>
            )}

            {txStatus.blockNumber && (
              <View style={styles.blockContainer}>
                <MaterialCommunityIcons
                  name="cube-outline"
                  size={16}
                  color={palette.neutralMid}
                />
                <Text style={styles.blockText}>
                  Block #{txStatus.blockNumber}
                </Text>
              </View>
            )}
          </Animated.View>

          <View style={styles.transactionDetails}>
            <Text style={styles.detailsTitle}>Transaction Details</Text>
            
            <View style={styles.detailRow}>
              <Text color={palette.neutralMid}>Amount</Text>
              <Text style={styles.detailValue}>
                {details.amount} {details.currency}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text color={palette.neutralMid}>Network</Text>
              <Text style={styles.detailValue}>{details.network}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text color={palette.neutralMid}>Hash</Text>
              <TouchableOpacity onPress={handleCopyHash}>
                <Text style={styles.hashText}>
                  {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actionButtons}>
            {explorerUrl && (
              <Button
                label="View on Explorer"
                variant="outline"
                onPress={handleViewOnExplorer}
              />
            )}
            <Button
              label="Share Receipt"
              variant="outline"
              onPress={handleShare}
            />
            <Button
              label={txStatus.status === "confirmed" ? "Done" : "Close"}
              onPress={() => navigation.reset({
                index: 0,
                routes: [{ name: "WalletHome" }],
              })}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // Show review screen
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
          <Text color={palette.white} style={styles.amountLabel}>
            You're Sending
          </Text>
          <Text style={styles.amountValue}>
            {details.amount} {details.currency}
          </Text>
          <Text color={palette.white} style={styles.amountNetwork}>
            on {details.network}
          </Text>
        </View>

        {/* Transaction Details */}
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

          {details.message && (
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
          )}
        </View>

        {/* Fee Breakdown */}
        <View style={styles.feeCard}>
          <Text variant="subtitle" style={styles.cardTitle}>
            Fee Breakdown
          </Text>
          
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
          
          <View style={styles.feeDivider} />
          
          <View style={styles.feeRow}>
            <Text variant="subtitle">Total You'll Send</Text>
            <Text variant="subtitle" color={palette.primaryBlue}>
              {details.amount} {details.currency}
            </Text>
          </View>
          
          <View style={styles.feeRow}>
            <Text variant="subtitle">Plus Network Fee</Text>
            <Text variant="subtitle" color={palette.neutralDark}>
              {details.fee.toFixed(6)} {selectedNetwork.primaryCurrency}
            </Text>
          </View>
          
          <Text style={styles.feeNote}>
            * Network fees are paid separately in {selectedNetwork.primaryCurrency}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={palette.primaryBlue} />
              <Text style={styles.processingText}>
                Sending transaction...
              </Text>
              <Text color={palette.neutralMid} style={styles.processingSubtext}>
                This may take a few moments
              </Text>
            </View>
          ) : (
            <>
              <Button
                label="Confirm & Send"
                onPress={handleConfirm}
              />
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => navigation.goBack()}
              />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
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
    fontSize: 14,
    opacity: 0.8,
  },
  amountValue: {
    color: palette.white,
    fontSize: 32,
    fontWeight: "700",
  },
  amountNetwork: {
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
    minHeight: 32,
  },
  detailLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.neutralDark,
    textAlign: "right",
    flex: 1,
  },
  feeCard: {
    backgroundColor: "#F8F9FF",
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
    fontSize: 14,
    fontWeight: "500",
    color: palette.neutralDark,
  },
  feeDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: spacing.sm,
  },
  feeNote: {
    fontSize: 11,
    color: palette.neutralMid,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.md,
  },
  processingContainer: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  processingText: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  processingSubtext: {
    fontSize: 14,
  },
  // Status screen styles
  statusContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.xl,
  },
  statusIconContainer: {
    alignItems: "center",
  },
  statusIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  statusContent: {
    alignItems: "center",
    gap: spacing.md,
  },
  statusTitle: {
    fontSize: 24,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: 16,
    color: palette.neutralMid,
    textAlign: "center",
    lineHeight: 24,
  },
  confirmationsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.successGreen + "15",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  confirmationsText: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.successGreen,
  },
  blockContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  blockText: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  transactionDetails: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: spacing.md,
    width: "100%",
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.sm,
  },
  hashText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: palette.primaryBlue,
    textDecorationLine: "underline",
  },
  actionButtons: {
    gap: spacing.md,
    width: "100%",
  },
});
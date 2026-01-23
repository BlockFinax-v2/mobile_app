/**
 * Financier Revocation Component for Treasury Portal
 *
 * Provides UI for financiers to manage their status revocation:
 * - Request 30-day revocation period
 * - Cancel pending revocation
 * - Complete revocation after waiting period
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { stakingService, RevocationStatus } from "@/services/stakingService";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface FinancierRevocationPanelProps {
  userAddress: string;
  isFinancier: boolean;
  onRevocationComplete?: () => void;
}

export function FinancierRevocationPanel({
  userAddress,
  isFinancier,
  onRevocationComplete,
}: FinancierRevocationPanelProps) {
  const [revocationStatus, setRevocationStatus] =
    useState<RevocationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load revocation status
  const loadRevocationStatus = useCallback(async () => {
    if (!isFinancier || !userAddress) return;

    setIsLoading(true);
    try {
      const status = await stakingService.getRevocationStatus(userAddress);
      setRevocationStatus(status);
    } catch (error) {
      console.error("Failed to load revocation status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isFinancier, userAddress]);

  useEffect(() => {
    loadRevocationStatus();
  }, [loadRevocationStatus]);

  // Handle request revocation
  const handleRequestRevocation = async () => {
    Alert.alert(
      "Request Financier Revocation",
      "This will start a 30-day waiting period. During this time:\n\n" +
        "• You'll lose voting power immediately\n" +
        "• You cannot create or vote on proposals\n" +
        "• You can cancel the request at any time\n" +
        "• After 30 days, you can complete the revocation\n\n" +
        "Do you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Revocation",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await stakingService.requestFinancierRevocation(
                (stage, message) => {
                  console.log(`Revocation Request - ${stage}: ${message}`);
                },
              );

              Alert.alert(
                "Revocation Requested",
                "Your financier revocation has been requested. You can complete it after 30 days.",
              );

              await loadRevocationStatus();
            } catch (error: any) {
              console.error("Revocation request failed:", error);
              Alert.alert("Request Failed", error.message);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  // Handle cancel revocation
  const handleCancelRevocation = async () => {
    Alert.alert(
      "Cancel Revocation",
      "This will restore your voting power and cancel the revocation process. Continue?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel Revocation",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await stakingService.cancelFinancierRevocation(
                (stage, message) => {
                  console.log(`Cancel Revocation - ${stage}: ${message}`);
                },
              );

              Alert.alert(
                "Revocation Cancelled",
                "Your revocation request has been cancelled. Your voting power is restored.",
              );

              await loadRevocationStatus();
            } catch (error: any) {
              console.error("Cancel revocation failed:", error);
              Alert.alert("Cancellation Failed", error.message);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  // Handle complete revocation
  const handleCompleteRevocation = async () => {
    Alert.alert(
      "Complete Revocation",
      "This will permanently remove your financier status. You can reapply later. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete Revocation",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await stakingService.completeFinancierRevocation(
                (stage, message) => {
                  console.log(`Complete Revocation - ${stage}: ${message}`);
                },
              );

              Alert.alert(
                "Revocation Complete",
                "Your financier status has been revoked. You can now unstake without restrictions.",
              );

              if (onRevocationComplete) {
                onRevocationComplete();
              }

              await loadRevocationStatus();
            } catch (error: any) {
              console.error("Complete revocation failed:", error);
              Alert.alert("Completion Failed", error.message);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  if (!isFinancier) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading revocation status...</Text>
      </View>
    );
  }

  const timeRemaining = revocationStatus?.revocationRequested
    ? Math.max(
        0,
        (revocationStatus.revocationDeadline - Date.now() / 1000) / 86400,
      )
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="account-remove"
          size={24}
          color={colors.warning}
        />
        <Text style={styles.title}>Financier Status Management</Text>
      </View>

      {revocationStatus?.revocationRequested ? (
        <>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Revocation Status</Text>
            <Text style={styles.statusValue}>Pending</Text>

            <Text style={styles.timeLabel}>Time Remaining</Text>
            <Text style={styles.timeValue}>
              {timeRemaining > 0
                ? `${Math.ceil(timeRemaining)} days`
                : "Ready to complete"}
            </Text>

            <Text style={styles.infoText}>
              {revocationStatus.canCompleteRevocation
                ? "You can now complete your revocation."
                : "You can cancel this request at any time."}
            </Text>
          </View>

          <View style={styles.actions}>
            {revocationStatus.canCompleteRevocation ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonDanger]}
                onPress={handleCompleteRevocation}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.buttonText}>Complete Revocation</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleCancelRevocation}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={20}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.buttonText, styles.buttonTextSecondary]}
                    >
                      Cancel Revocation
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.description}>
            As a financier, you can request to revoke your status. This starts a
            30-day waiting period.
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonWarning]}
            onPress={handleRequestRevocation}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color="white"
                />
                <Text style={styles.buttonText}>Request Revocation</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.sm,
  },
  statusCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.warning,
    marginBottom: spacing.md,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    gap: spacing.sm,
  },
  buttonDanger: {
    backgroundColor: colors.error,
  },
  buttonWarning: {
    backgroundColor: colors.warning,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});

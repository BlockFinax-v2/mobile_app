import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { DashboardStackParamList } from "@/navigation/types";
import { realTransactionService } from "@/services/realTransactionService";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { RouteProp, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const statusIconMap: Record<string, string> = {
  Completed: "check-circle-outline",
  Pending: "progress-clock",
  Failed: "close-circle-outline",
};

interface TransactionDetails {
  hash: string;
  status: string;
  date: string;
  sender: string;
  recipient: string;
  amount: string;
  fee: string;
  network: string;
  blockNumber: string;
  type: string;
  explorerUrl?: string;
}

export const TransactionDetailsScreen: React.FC = () => {
  const route =
    useRoute<RouteProp<DashboardStackParamList, "TransactionDetails">>();
  const { selectedNetwork } = useWallet();
  const [details, setDetails] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const transactionHash = route.params?.id;

  useEffect(() => {
    const loadTransactionDetails = async () => {
      if (!transactionHash || transactionHash === "portfolio") {
        // Handle portfolio view case
        setDetails({
          hash: "Portfolio Overview",
          status: "Active",
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          sender: "Multiple Sources",
          recipient: "Your Wallet",
          amount: "Portfolio Balance",
          fee: "Network Fees Apply",
          network: selectedNetwork.name,
          blockNumber: "Latest",
          type: "Portfolio Summary",
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const transaction = await realTransactionService.getTransactionByHash(
          transactionHash,
          selectedNetwork
        );

        if (transaction) {
          const explorerUrl = selectedNetwork.explorerUrl
            ? `${selectedNetwork.explorerUrl}/tx/${transaction.hash}`
            : undefined;

          setDetails({
            hash: transaction.hash,
            status:
              transaction.status === "confirmed"
                ? "Completed"
                : transaction.status === "pending"
                ? "Pending"
                : "Failed",
            date: transaction.timestamp.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            sender: transaction.from,
            recipient: transaction.to,
            amount: transaction.amount,
            fee:
              transaction.gasUsed && transaction.gasPrice
                ? `${(
                    (parseFloat(transaction.gasUsed) *
                      parseFloat(transaction.gasPrice)) /
                    1e18
                  ).toFixed(6)} ${selectedNetwork.primaryCurrency}`
                : "Unknown",
            network: selectedNetwork.name,
            blockNumber: transaction.blockNumber?.toString() || "Unknown",
            type: transaction.description,
            explorerUrl,
          });
        } else {
          // Fallback for transaction not found
          setDetails({
            hash: transactionHash,
            status: "Not Found",
            date: "Unknown",
            sender: "Unknown",
            recipient: "Unknown",
            amount: "Unknown",
            fee: "Unknown",
            network: selectedNetwork.name,
            blockNumber: "Unknown",
            type: "Transaction",
          });
        }
      } catch (error) {
        console.error("Failed to load transaction details:", error);
        // Show basic info even if fetch fails
        setDetails({
          hash: transactionHash,
          status: "Error Loading",
          date: "Unknown",
          sender: "Unknown",
          recipient: "Unknown",
          amount: "Unknown",
          fee: "Unknown",
          network: selectedNetwork.name,
          blockNumber: "Unknown",
          type: "Transaction",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTransactionDetails();
  }, [transactionHash, selectedNetwork]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primaryBlue} />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </Screen>
    );
  }

  if (!details) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={palette.errorRed}
          />
          <Text style={styles.errorText}>Transaction not found</Text>
        </View>
      </Screen>
    );
  }

  const openExplorer = () => {
    if (details.explorerUrl) {
      Linking.openURL(details.explorerUrl);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text variant="subtitle" color={palette.primaryBlue}>
              Transaction Hash
            </Text>
            <Button
              label="Copy Hash"
              variant="outline"
              style={styles.smallButton}
            />
          </View>
          <Text style={styles.value}>{details.hash}</Text>

          <View style={styles.statusRow}>
            <MaterialCommunityIcons
              name={statusIconMap[details.status]}
              size={28}
              color={palette.accentGreen}
            />
            <Text variant="subtitle" color={palette.accentGreen}>
              {details.status}
            </Text>
          </View>
          <Text color={palette.neutralMid}>{details.date}</Text>
        </View>

        <View style={styles.card}>
          <Text
            variant="subtitle"
            color={palette.primaryBlue}
            style={styles.sectionTitle}
          >
            Transaction Overview
          </Text>
          <View style={styles.listItem}>
            <Text color={palette.neutralMid}>Type</Text>
            <Text>{details.type}</Text>
          </View>
          <View style={styles.listItem}>
            <Text color={palette.neutralMid}>Amount</Text>
            <Text color={palette.primaryBlue} style={styles.bold}>
              {details.amount}
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text color={palette.neutralMid}>Network</Text>
            <Text>{details.network}</Text>
          </View>
          <View style={styles.listItem}>
            <Text color={palette.neutralMid}>Gas Fee</Text>
            <Text>{details.fee}</Text>
          </View>
          <View style={styles.listItem}>
            <Text color={palette.neutralMid}>Block</Text>
            <Text>{details.blockNumber}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text
            variant="subtitle"
            color={palette.primaryBlue}
            style={styles.sectionTitle}
          >
            Participants
          </Text>
          <View style={styles.listItem}>
            <Text color={palette.neutralMid}>Sender</Text>
            <Text style={styles.address}>{details.sender}</Text>
          </View>
          <View style={styles.listItem}>
            <Text color={palette.neutralMid}>Receiver</Text>
            <Text style={styles.address}>{details.recipient}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text
            variant="subtitle"
            color={palette.primaryBlue}
            style={styles.sectionTitle}
          >
            Notes
          </Text>
          <Text color={palette.neutralMid}>
            Add a private note for this transaction.
          </Text>
          <Button
            label="Add Note"
            variant="outline"
            style={styles.addNoteButton}
          />
        </View>

        <View style={styles.footerButtons}>
          <Button label="View on Explorer" onPress={openExplorer} />
          <Button label="Share" variant="outline" />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smallButton: {
    width: 120,
  },
  value: {
    color: palette.neutralDark,
    fontFamily:
      Platform.select({ ios: "Menlo", android: "monospace" }) ?? undefined,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bold: {
    fontWeight: "700",
  },
  address: {
    maxWidth: "60%",
    textAlign: "right",
  },
  addNoteButton: {
    alignSelf: "flex-start",
  },
  footerButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: palette.neutralMid,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  errorText: {
    fontSize: 18,
    color: palette.errorRed,
    fontWeight: "600",
  },
});

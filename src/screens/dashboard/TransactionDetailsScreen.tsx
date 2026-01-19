import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { DashboardStackParamList } from "@/navigation/types";
import { realTransactionService, RealTransaction } from "@/services/realTransactionService";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const statusIconMap: Record<string, string> = {
  Completed: "check-circle-outline",
  Pending: "progress-clock",
  Failed: "close-circle-outline",
  confirmed: "check-circle-outline",
  pending: "progress-clock",
  failed: "close-circle-outline",
};

type TransactionFilter = 'all' | 'send' | 'receive' | 'contract';

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
  const route = useRoute<RouteProp<DashboardStackParamList, "TransactionDetails">>();
  const navigation = useNavigation();
  const { selectedNetwork, transactions } = useWallet();
  const [details, setDetails] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TransactionFilter>('all');

  const transactionHash = route.params?.id;
  const isListView = transactionHash === 'all';

  // Filter transactions based on selected filter
  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter(tx => tx.type === filter);
  }, [transactions, filter]);

  // Transaction stats
  const stats = useMemo(() => {
    return {
      all: transactions.length,
      send: transactions.filter(tx => tx.type === 'send').length,
      receive: transactions.filter(tx => tx.type === 'receive').length,
      contract: transactions.filter(tx => tx.type === 'contract').length,
    };
  }, [transactions]);

  useEffect(() => {
    // Skip loading for list view
    if (isListView) {
      setLoading(false);
      return;
    }

    // Skip if no valid transaction hash
    if (!transactionHash || transactionHash === 'all') {
      setLoading(false);
      return;
    }

    const loadTransactionDetails = async () => {
      if (transactionHash === "portfolio") {
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
  }, [transactionHash, selectedNetwork, isListView]);

  // List View - All Transactions with Filters
  if (isListView) {
    return (
      <Screen>
        <View style={styles.listContainer}>
          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            <Pressable
              style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                All ({stats.all})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, filter === 'send' && styles.filterButtonActive]}
              onPress={() => setFilter('send')}
            >
              <Text style={[styles.filterText, filter === 'send' && styles.filterTextActive]}>
                Sent ({stats.send})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, filter === 'receive' && styles.filterButtonActive]}
              onPress={() => setFilter('receive')}
            >
              <Text style={[styles.filterText, filter === 'receive' && styles.filterTextActive]}>
                Received ({stats.receive})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, filter === 'contract' && styles.filterButtonActive]}
              onPress={() => setFilter('contract')}
            >
              <Text style={[styles.filterText, filter === 'contract' && styles.filterTextActive]}>
                Contract ({stats.contract})
              </Text>
            </Pressable>
          </ScrollView>

          {/* Transactions List */}
          <ScrollView 
            contentContainerStyle={styles.listContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="history" 
                  size={64} 
                  color={palette.neutralMid} 
                />
                <Text style={styles.emptyTitle}>No Transactions</Text>
                <Text style={styles.emptySubtitle}>
                  {filter === 'all' 
                    ? 'Your transaction history will appear here'
                    : `No ${filter} transactions found`}
                </Text>
              </View>
            ) : (
              filteredTransactions.map((transaction) => {
                const formatted = realTransactionService.formatTransactionForDisplay(transaction);
                return (
                  <Pressable
                    key={transaction.id}
                    style={styles.transactionCard}
                    onPress={() => navigation.navigate('TransactionDetails' as never, { id: transaction.hash } as never)}
                  >
                    <View style={[styles.transactionIcon, { backgroundColor: formatted.color + '20' }]}>
                      <MaterialCommunityIcons
                        name={formatted.icon as any}
                        color={formatted.color}
                        size={24}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>{formatted.title}</Text>
                      <Text style={styles.transactionSubtitle}>{formatted.subtitle}</Text>
                      <Text style={styles.transactionDate}>
                        {formatted.date} • {transaction.status}
                      </Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[styles.transactionAmount, { color: formatted.color }]}>
                        {formatted.amount}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={palette.neutralMid}
                      />
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </Screen>
    );
  }

  // Detail View (existing code)

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
  // List View Styles
  listContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  filterScroll: {
    maxHeight: 60,
    flexGrow: 0,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: palette.primaryBlue,
    borderColor: palette.primaryBlue,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.neutralDark,
  },
  filterTextActive: {
    color: palette.white,
  },
  listContentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.neutralDark,
  },
  emptySubtitle: {
    fontSize: 14,
    color: palette.neutralMid,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionInfo: {
    flex: 1,
    gap: 4,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.neutralDark,
  },
  transactionSubtitle: {
    fontSize: 13,
    color: palette.neutralMid,
  },
  transactionDate: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Detail View Styles (existing)
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

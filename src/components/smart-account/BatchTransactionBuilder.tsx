import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import type { PaymentToken } from "@/hooks/usePayment";

export interface BatchTransaction {
  id: string;
  recipientAddress: string;
  amount: string;
  token: PaymentToken;
  message?: string;
}

interface BatchTransactionBuilderProps {
  enabled: boolean;
  transactions: BatchTransaction[];
  onTransactionsChange: (transactions: BatchTransaction[]) => void;
  availableTokens: PaymentToken[];
  selectedToken: PaymentToken;
}

export const BatchTransactionBuilder: React.FC<
  BatchTransactionBuilderProps
> = ({
  enabled,
  transactions,
  onTransactionsChange,
  availableTokens,
  selectedToken,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addTransaction = () => {
    const newTransaction: BatchTransaction = {
      id: Date.now().toString(),
      recipientAddress: "",
      amount: "",
      token: selectedToken,
      message: "",
    };
    onTransactionsChange([...transactions, newTransaction]);
    setExpandedId(newTransaction.id);
  };

  const removeTransaction = (id: string) => {
    Alert.alert(
      "Remove Transaction",
      "Are you sure you want to remove this transaction from the batch?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            onTransactionsChange(transactions.filter((t) => t.id !== id));
            if (expandedId === id) {
              setExpandedId(null);
            }
          },
        },
      ]
    );
  };

  const updateTransaction = (
    id: string,
    updates: Partial<BatchTransaction>
  ) => {
    onTransactionsChange(
      transactions.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!enabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="layers"
          size={20}
          color={palette.primaryBlue}
        />
        <Text style={styles.title}>Batch Transactions</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{transactions.length}</Text>
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView style={styles.transactionsList} nestedScrollEnabled>
        {transactions.map((transaction, index) => {
          const isExpanded = expandedId === transaction.id;
          const isValid =
            transaction.recipientAddress &&
            parseFloat(transaction.amount || "0") > 0;

          return (
            <View
              key={transaction.id}
              style={[
                styles.transactionCard,
                isExpanded && styles.transactionCardExpanded,
              ]}
            >
              {/* Transaction Header */}
              <TouchableOpacity
                style={styles.transactionHeader}
                onPress={() => toggleExpand(transaction.id)}
              >
                <View style={styles.transactionHeaderLeft}>
                  <Text style={styles.transactionNumber}>#{index + 1}</Text>
                  <View style={styles.transactionSummary}>
                    <Text style={styles.transactionAmount} numberOfLines={1}>
                      {transaction.amount || "0"} {transaction.token.symbol}
                    </Text>
                    <Text style={styles.transactionRecipient} numberOfLines={1}>
                      {transaction.recipientAddress || "No recipient"}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionHeaderRight}>
                  {isValid && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color={palette.accentGreen}
                    />
                  )}
                  <TouchableOpacity
                    onPress={() => removeTransaction(transaction.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={20}
                      color={palette.errorRed}
                    />
                  </TouchableOpacity>
                  <MaterialCommunityIcons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={palette.neutralMid}
                  />
                </View>
              </TouchableOpacity>

              {/* Transaction Details (Expanded) */}
              {isExpanded && (
                <View style={styles.transactionDetails}>
                  {/* Recipient Address */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Recipient Address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0x..."
                      value={transaction.recipientAddress}
                      onChangeText={(text) =>
                        updateTransaction(transaction.id, {
                          recipientAddress: text,
                        })
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Amount */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Amount</Text>
                    <View style={styles.amountContainer}>
                      <TextInput
                        style={[styles.input, styles.amountInput]}
                        placeholder="0.0"
                        value={transaction.amount}
                        onChangeText={(text) =>
                          updateTransaction(transaction.id, { amount: text })
                        }
                        keyboardType="decimal-pad"
                      />
                      <Text style={styles.tokenSymbol}>
                        {transaction.token.symbol}
                      </Text>
                    </View>
                  </View>

                  {/* Message (Optional) */}
                  <View style={styles.field}>
                    <Text style={styles.label}>Message (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.messageInput]}
                      placeholder="Add a note..."
                      value={transaction.message}
                      onChangeText={(text) =>
                        updateTransaction(transaction.id, { message: text })
                      }
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Transaction Button */}
      <TouchableOpacity style={styles.addButton} onPress={addTransaction}>
        <MaterialCommunityIcons
          name="plus-circle"
          size={20}
          color={palette.primaryBlue}
        />
        <Text style={styles.addButtonText}>Add Another Transaction</Text>
      </TouchableOpacity>

      {/* Summary */}
      {transactions.length > 0 && (
        <View style={styles.summary}>
          <MaterialCommunityIcons
            name="information"
            size={16}
            color={palette.primaryBlue}
          />
          <Text style={styles.summaryText}>
            All {transactions.length} transaction
            {transactions.length > 1 ? "s" : ""} will be sent together in one
            batch
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF9E6",
    borderRadius: 16,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.primaryBlue + "30",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    flex: 1,
  },
  badge: {
    backgroundColor: palette.primaryBlue,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.white,
  },
  transactionsList: {
    maxHeight: 300,
  },
  transactionCard: {
    backgroundColor: palette.white,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  transactionCardExpanded: {
    borderColor: palette.primaryBlue,
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  transactionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  transactionNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.primaryBlue,
    backgroundColor: palette.primaryBlue + "20",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  transactionSummary: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  transactionRecipient: {
    fontSize: 11,
    color: palette.neutralMid,
    marginTop: 2,
  },
  transactionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  transactionDetails: {
    padding: spacing.sm,
    paddingTop: 0,
    gap: spacing.sm,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  input: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 14,
    color: palette.neutralDark,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  amountInput: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  messageInput: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: palette.primaryBlue,
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primaryBlue,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: palette.primaryBlue + "10",
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 11,
    color: palette.neutralDark,
    flex: 1,
  },
});

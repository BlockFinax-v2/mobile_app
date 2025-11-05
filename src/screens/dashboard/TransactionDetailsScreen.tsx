import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DashboardStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { RouteProp, useRoute } from "@react-navigation/native";
import React from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const mockTransaction = {
  hash: "0x1234abcd5678ef90",
  status: "Completed",
  date: "October 27, 2025 - 14:23",
  sender: "0xF1a21d79A91c07fF9dCA2F3077398C2D1a2B3F56",
  recipient: "0xb67E8136b0a4BbD5fbb3762E508a403Ef5bA0D30",
  amount: "1,200 USDC",
  fee: "0.45 MATIC",
  network: "Lisk Sepolia Testnet",
  blockNumber: "45231054",
  type: "Escrow Funding",
  explorerUrl: "https://sepolia-blockscout.lisk.com/tx/0x1234abcd5678ef90",
};

const statusIconMap: Record<string, string> = {
  Completed: "check-circle-outline",
  Pending: "progress-clock",
  Failed: "close-circle-outline",
};

export const TransactionDetailsScreen: React.FC = () => {
  const route =
    useRoute<RouteProp<DashboardStackParamList, "TransactionDetails">>();
  const details = { ...mockTransaction, id: route.params?.id };

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
});

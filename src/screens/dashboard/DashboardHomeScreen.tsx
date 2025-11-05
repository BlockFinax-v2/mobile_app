import { NetworkSelector } from "@/components/ui/NetworkSelector";
import { Text } from "@/components/ui/Text";
import { useNetwork } from "@/contexts/NetworkContext";
import { useWallet } from "@/contexts/WalletContext";
import { AppTabParamList, DashboardStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const quickActions = [
  {
    id: "send",
    label: "Send Payment",
    icon: "send-circle",
    color: palette.primaryBlue,
  },
  {
    id: "request",
    label: "Request Payment",
    icon: "download-circle",
    color: "#00CED1",
  },
  {
    id: "contract",
    label: "New Contract",
    icon: "file-plus",
    color: palette.primaryBlue,
  },
  {
    id: "document",
    label: "Upload Document",
    icon: "cloud-upload",
    color: palette.accentGreen,
  },
];

const statsCards = [
  {
    id: "balance",
    title: "Account Balance",
    valueKey: "balance",
  },
  {
    id: "escrow",
    title: "Escrow Status",
    value: "3 Active",
    subtitle: "USDC 45,000 locked",
  },
  {
    id: "quick",
    title: "Quick Stats",
    value: "12 Transactions",
    subtitle: "Volume: USDC 120,500",
  },
];

const transactionsMock = [
  {
    id: "1",
    description: "Sent USDC to Ahmed",
    amount: "-1,200 USDC",
    type: "send",
    status: "completed",
    date: "Oct 28",
  },
  {
    id: "2",
    description: "Escrow funding - Contract #123",
    amount: "-15,000 USDC",
    type: "escrow",
    status: "pending",
    date: "Oct 27",
  },
  {
    id: "3",
    description: "Received USDC from Kofi",
    amount: "+5,000 USDC",
    type: "receive",
    status: "completed",
    date: "Oct 25",
  },
  {
    id: "4",
    description: "Document verification fee",
    amount: "-75 USDC",
    type: "contract",
    status: "completed",
    date: "Oct 24",
  },
  {
    id: "5",
    description: "Received escrow release",
    amount: "+10,000 USDC",
    type: "escrow",
    status: "completed",
    date: "Oct 23",
  },
];

const statusColorMap: Record<string, string> = {
  completed: palette.accentGreen,
  pending: palette.warningYellow,
  failed: palette.errorRed,
};

type DashboardNavigation = CompositeNavigationProp<
  StackNavigationProp<DashboardStackParamList, "DashboardHome">,
  BottomTabNavigationProp<AppTabParamList>
>;

export const DashboardHomeScreen: React.FC = () => {
  const { balances, address } = useWallet();
  const { selectedNetwork, setSelectedNetwork } = useNetwork();
  const accountDisplay = useMemo(
    () => address?.slice(0, 6) + "..." + address?.slice(-4),
    [address]
  );
  const navigation = useNavigation<DashboardNavigation>();

  const handleQuickAction = (id: string) => {
    switch (id) {
      case "send":
        navigation.navigate("WalletTab", { screen: "SendPayment" });
        break;
      case "request":
        navigation.navigate("WalletTab", { screen: "ReceivePayment" });
        break;
      case "contract":
        navigation.navigate("WalletTab", { screen: "CreateInvoice" });
        break;
      case "document":
        navigation.navigate("WalletTab", { screen: "DocumentCenter" });
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.surface} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Combined Header - Welcome + Icons */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.userAddress}>
              {accountDisplay || "BlockFinaX User"}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconButton}>
              <MaterialCommunityIcons
                name="cog-outline"
                size={24}
                color={palette.neutralDark}
              />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={24}
                color={palette.neutralDark}
              />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={24}
                color={palette.neutralDark}
              />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>
        </View>

        {/* Balance Card - Your original portfolio balance */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Pressable
              onPress={() =>
                navigation.navigate("WalletTab", {
                  screen: "TransactionDetails",
                  params: { id: "portfolio" },
                })
              }
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={palette.white}
              />
            </Pressable>
          </View>
          <Text style={styles.balanceAmount}>
            {balances.primary.toFixed(2)} USDC
          </Text>
          <Text style={styles.balanceUsd}>${balances.usd.toFixed(2)} USD</Text>

          {/* Network Selector */}
          <View style={styles.networkSelectorContainer}>
            <NetworkSelector
              selectedNetwork={selectedNetwork}
              onNetworkSelect={setSelectedNetwork}
              style={styles.networkSelector}
            />
          </View>

          <View style={styles.balanceActions}>
            <Pressable
              style={styles.balanceActionButton}
              onPress={() =>
                navigation.navigate("WalletTab", { screen: "SendPayment" })
              }
            >
              <Text style={styles.balanceActionText}>Send Money</Text>
            </Pressable>
            <Pressable
              style={styles.balanceActionButton}
              onPress={() =>
                navigation.navigate("WalletTab", { screen: "ReceivePayment" })
              }
            >
              <Text style={styles.balanceActionText}>Receive</Text>
            </Pressable>
          </View>
        </View>

        {/* Your Original Quick Actions */}
        <View style={styles.quickActionsGrid}>
          <View style={styles.quickActionsRow}>
            <Pressable
              style={styles.quickActionItem}
              onPress={() => handleQuickAction("send")}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons
                  name="send-circle"
                  size={24}
                  color={palette.primaryBlue}
                />
              </View>
              <Text style={styles.quickActionLabel}>Send Payment</Text>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() => handleQuickAction("request")}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons
                  name="download-circle"
                  size={24}
                  color={palette.primaryBlue}
                />
              </View>
              <Text style={styles.quickActionLabel}>Request Payment</Text>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() => handleQuickAction("contract")}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons
                  name="invoice-text"
                  size={24}
                  color={palette.primaryBlue}
                />
              </View>
              <Text style={styles.quickActionLabel}>Create Invoice</Text>
            </Pressable>
          </View>

          <View style={styles.quickActionsRow}>
            <Pressable
              style={styles.quickActionItem}
              onPress={() => handleQuickAction("document")}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons
                  name="cloud-upload"
                  size={24}
                  color={palette.primaryBlue}
                />
              </View>
              <Text style={styles.quickActionLabel}>Upload Document</Text>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() =>
                navigation.navigate("WalletTab", { screen: "TreasuryPortal" })
              }
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons
                  name="bank"
                  size={24}
                  color={palette.primaryBlue}
                />
              </View>
              <Text style={styles.quickActionLabel}>Treasury Portal</Text>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() =>
                navigation.navigate("WalletTab", { screen: "Rewards" })
              }
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons
                  name="gift"
                  size={24}
                  color={palette.primaryBlue}
                />
              </View>
              <Text style={styles.quickActionLabel}>Rewards</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Transactions with View All */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Pressable
              onPress={() =>
                navigation.navigate("WalletTab", {
                  screen: "TransactionDetails",
                  params: { id: "all" },
                })
              }
            >
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>

          {transactionsMock.slice(0, 4).map((item) => (
            <Pressable
              key={item.id}
              style={styles.transactionItem}
              onPress={() =>
                navigation.navigate("WalletTab", {
                  screen: "TransactionDetails",
                  params: { id: item.id },
                })
              }
            >
              <View style={styles.transactionIcon}>
                <MaterialCommunityIcons
                  name={
                    item.type === "send"
                      ? "arrow-top-right"
                      : item.type === "receive"
                      ? "arrow-bottom-left"
                      : item.type === "escrow"
                      ? "lock-outline"
                      : "file-document-outline"
                  }
                  color={palette.primaryBlue}
                  size={20}
                />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDescription}>
                  {item.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {item.date} • {item.status}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  {
                    color:
                      item.type === "receive"
                        ? palette.accentGreen
                        : palette.neutralDark,
                  },
                ]}
              >
                {item.amount}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: spacing.md,
    paddingTop: Platform.select({
      ios: 50, // Minimal top padding for iOS status bar
      android: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 30,
    }),
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Changed to flex-start to align with the text layout
    paddingVertical: spacing.sm,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  welcomeText: {
    fontSize: 14,
    color: palette.neutralMid,
    fontWeight: "500",
  },
  userAddress: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  headerIcons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconButton: {
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.errorRed,
  },
  balanceCard: {
    backgroundColor: palette.primaryBlue,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    color: palette.white,
    fontSize: 14,
    opacity: 0.9,
  },
  balanceAmount: {
    color: palette.white,
    fontSize: 32,
    fontWeight: "700",
  },
  balanceUsd: {
    color: palette.white,
    fontSize: 16,
    opacity: 0.9,
    marginTop: -spacing.xs,
  },
  networkSelectorContainer: {
    marginTop: spacing.sm,
  },
  networkSelector: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  balanceActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  balanceActionButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  balanceActionText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: "600",
  },
  addMoneyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    alignSelf: "flex-start",
  },
  addMoneyText: {
    color: palette.primaryBlue,
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.primaryBlue,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.primaryBlue + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  transactionDetails: {
    flex: 1,
    gap: 2,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.neutralDark,
  },
  transactionDate: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  quickActionsGrid: {
    gap: spacing.lg,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionItem: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.neutralDark,
    textAlign: "center",
  },
});

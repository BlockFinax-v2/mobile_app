import { Text } from "@/components/ui/Text";
import {
  useWallet,
  SupportedNetworkId,
  getMainnetNetworks,
  getTestnetNetworks,
  WalletNetwork,
} from "@/contexts/WalletContext";
import { AppTabParamList, DashboardStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Network icon mapping
const getNetworkIcon = (networkId: SupportedNetworkId): string => {
  if (networkId.includes("ethereum")) return "ethereum";
  if (networkId.includes("base")) return "alpha-b-circle-outline";
  if (networkId.includes("lisk")) return "flash-circle";
  if (networkId.includes("polygon")) return "triangle";
  if (networkId.includes("bsc") || networkId.includes("bnb"))
    return "alpha-b-circle";
  return "earth";
};

// Network color mapping
const getNetworkColor = (networkId: SupportedNetworkId): string => {
  if (networkId.includes("ethereum")) return "#627EEA";
  if (networkId.includes("base")) return "#0052FF";
  if (networkId.includes("lisk")) return "#4070F4";
  if (networkId.includes("polygon")) return "#8247E5";
  if (networkId.includes("bsc") || networkId.includes("bnb")) return "#F3BA2F";
  return palette.primaryBlue;
};

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
  const { balances, address, selectedNetwork, switchNetwork } = useWallet();
  const [showNetworkConfig, setShowNetworkConfig] = useState(false);
  const accountDisplay = useMemo(
    () => address?.slice(0, 6) + "..." + address?.slice(-4),
    [address]
  );
  const navigation = useNavigation<DashboardNavigation>();

  // Get organized networks for the config modal
  const mainnetNetworks = useMemo(() => getMainnetNetworks(), []);
  const testnetNetworks = useMemo(() => getTestnetNetworks(), []);

  const handleNetworkConfigSelect = async (networkId: SupportedNetworkId) => {
    try {
      await switchNetwork(networkId);
      setShowNetworkConfig(false); // Close modal after selection
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  const renderNetworkConfigItem = (network: WalletNetwork) => {
    const isActive = selectedNetwork.id === network.id;
    const icon = getNetworkIcon(network.id);
    const color = getNetworkColor(network.id);

    return (
      <Pressable
        key={network.id}
        style={[styles.networkCard, isActive && styles.activeNetworkCard]}
        onPress={() => handleNetworkConfigSelect(network.id)}
      >
        <View style={styles.networkCardContent}>
          <View style={styles.networkInfo}>
            <View style={[styles.networkIcon, { backgroundColor: color }]}>
              <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color={palette.white}
              />
            </View>
            <View style={styles.networkDetails}>
              <Text style={styles.networkName}>{network.name}</Text>
              <Text style={styles.networkMeta}>
                Chain ID: {network.chainId}
              </Text>
              <Text style={styles.networkMeta} numberOfLines={1}>
                {network.primaryCurrency}
              </Text>
              {network.stablecoins && network.stablecoins.length > 0 && (
                <Text style={styles.tokenCount}>
                  {network.stablecoins.length} stablecoin
                  {network.stablecoins.length !== 1 ? "s" : ""} supported
                </Text>
              )}
            </View>
          </View>
          <View style={styles.networkActions}>
            {isActive ? (
              <View style={styles.activeIndicator}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color={palette.accentGreen}
                />
                <Text style={styles.activeText}>Active</Text>
              </View>
            ) : (
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={palette.neutralMid}
              />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

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
            <Pressable
              style={styles.iconButton}
              onPress={() =>
                navigation.navigate("WalletTab", { screen: "ProfileHome" })
              }
            >
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

          {/* Network Configuration Button */}
          <View style={styles.networkSelectorContainer}>
            <Pressable
              style={styles.networkInfoButton}
              onPress={() => setShowNetworkConfig(true)}
            >
              <View style={styles.networkInfoContent}>
                <View style={styles.networkInfoLeft}>
                  <MaterialCommunityIcons
                    name={getNetworkIcon(selectedNetwork.id)}
                    size={24}
                    color={getNetworkColor(selectedNetwork.id)}
                  />
                  <View>
                    <Text style={styles.networkInfoName}>
                      {selectedNetwork.name}
                    </Text>
                    <Text style={styles.networkInfoMeta}>
                      Chain ID: {selectedNetwork.chainId}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={palette.white}
                />
              </View>
            </Pressable>
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

      {/* Network Configuration Modal */}
      <Modal
        visible={showNetworkConfig}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNetworkConfig(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <MaterialCommunityIcons
                name="lan"
                size={24}
                color={palette.primaryBlue}
              />
              <Text style={styles.modalTitle}>Network Configuration</Text>
            </View>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowNetworkConfig(false)}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={palette.neutralDark}
              />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalSubtitle}>
              Select your preferred blockchain network
            </Text>

            {/* Mainnet Networks Section */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={20}
                  color={palette.primaryBlue}
                />
                <Text style={styles.modalSectionTitle}>Mainnet Networks</Text>
              </View>
              <Text style={styles.modalSectionDescription}>
                Production networks with real assets
              </Text>
              {mainnetNetworks.map((network) =>
                renderNetworkConfigItem(network)
              )}
            </View>

            {/* Testnet Networks Section */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <MaterialCommunityIcons
                  name="test-tube"
                  size={20}
                  color={palette.warningYellow}
                />
                <Text style={styles.modalSectionTitle}>Testnet Networks</Text>
              </View>
              <Text style={styles.modalSectionDescription}>
                Testing networks with test tokens (no real value)
              </Text>
              {testnetNetworks.map((network) =>
                renderNetworkConfigItem(network)
              )}
            </View>

            {/* Info Card */}
            <View style={styles.modalInfoCard}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={palette.primaryBlue}
              />
              <View style={styles.modalInfoContent}>
                <Text style={styles.modalInfoTitle}>Network Information</Text>
                <Text style={styles.modalInfoText}>
                  • Mainnets handle real transactions with actual value{"\n"}•
                  Testnets are for development and testing only{"\n"}• You can
                  switch networks anytime from the wallet
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  networkInfoButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  networkInfoContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  networkInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  networkInfoName: {
    color: palette.white,
    fontSize: 14,
    fontWeight: "600",
  },
  networkInfoMeta: {
    color: palette.white,
    fontSize: 12,
    opacity: 0.8,
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
  // Network Configuration Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: Platform.select({
      ios: 50,
      android: 20,
    }),
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLighter,
  },
  modalHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  modalSubtitle: {
    fontSize: 14,
    color: palette.neutralMid,
    textAlign: "center",
    marginVertical: spacing.lg,
  },
  modalSection: {
    marginBottom: spacing.xl,
  },
  modalSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  modalSectionDescription: {
    fontSize: 14,
    color: palette.neutralMid,
    marginBottom: spacing.md,
  },
  networkCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeNetworkCard: {
    borderColor: palette.accentGreen,
    borderWidth: 2,
  },
  networkCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  networkInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
  },
  networkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  networkDetails: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.xs,
  },
  networkMeta: {
    fontSize: 12,
    color: palette.neutralMid,
    marginBottom: 2,
  },
  tokenCount: {
    fontSize: 11,
    color: palette.primaryBlue,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  networkActions: {
    marginLeft: spacing.sm,
  },
  activeIndicator: {
    alignItems: "center",
    gap: spacing.xs,
  },
  activeText: {
    fontSize: 11,
    fontWeight: "600",
    color: palette.accentGreen,
  },
  modalInfoCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.primaryBlueLight,
    marginBottom: spacing.xl,
  },
  modalInfoContent: {
    flex: 1,
  },
  modalInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primaryBlue,
    marginBottom: spacing.xs,
  },
  modalInfoText: {
    fontSize: 13,
    color: palette.neutralDark,
    lineHeight: 20,
  },
});

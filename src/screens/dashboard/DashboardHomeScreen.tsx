import { Text } from "@/components/ui/Text";
import {
  useWallet,
  SupportedNetworkId,
  getMainnetNetworks,
  getTestnetNetworks,
  WalletNetwork,
} from "@/contexts/WalletContext";
import {
  useInstantNavigation,
  useDeferredUpdates,
} from "@/hooks/usePerformantNavigation";
import { formatBalanceForUI } from "@/utils/tokenUtils";
import { realTransactionService } from "@/services/realTransactionService";
import { AppTabParamList, DashboardStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  if (networkId.includes("lisk")) return "alpha-l-circle";
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
    id: "buysell",
    label: "Buy & Sell",
    icon: "shopping-outline",
    color: palette.accentGreen,
  },
  {
    id: "document",
    label: "Upload Document",
    icon: "cloud-upload",
    color: palette.primaryBlue,
  },
];

// Removed mock stats data - now calculating from real transaction data

// Removed mock transaction data - now using real blockchain data

const statusColorMap: Record<string, string> = {
  completed: palette.accentGreen,
  pending: palette.warningYellow,
  failed: palette.errorRed,
};

type DashboardNavigation = CompositeNavigationProp<
  StackNavigationProp<DashboardStackParamList, "DashboardHome">,
  BottomTabNavigationProp<AppTabParamList>
>;

// Time formatting helper
const getTimeAgo = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

export default function DashboardHomeScreen() {
  const {
    balances,
    address,
    selectedNetwork,
    switchNetwork,
    refreshBalance,
    forceRefreshBalance,
    refreshBalanceInstant,
    transactions,
    isLoadingTransactions,
    isRefreshingBalance,
    isRefreshingTransactions,
    lastBalanceUpdate,
    lastTransactionUpdate,
    refreshTransactions,
    refreshTransactionsInstant,
  } = useWallet();

  const { navigateInstant } = useInstantNavigation();
  const { deferHeavyUpdate } = useDeferredUpdates();
  const [showNetworkConfig, setShowNetworkConfig] = useState(false);
  // Removed selectedTokenSymbol state - now showing total portfolio value
  const [expandedNetworkId, setExpandedNetworkId] = useState<string | null>(
    null
  );
  const accountDisplay = useMemo(
    () => address?.slice(0, 6) + "..." + address?.slice(-4),
    [address]
  );
  const navigation = useNavigation<DashboardNavigation>();

  // Debug logging for balances
  console.log("Current balances:", balances);
  console.log("Selected network:", selectedNetwork);

  // Refresh balance and transactions when component mounts or network changes
  // But not on every render - only when truly necessary
  useEffect(() => {
    console.log(
      "Dashboard mounted or network changed, refreshing data if needed"
    );
    // The refresh functions now have built-in throttling to avoid excessive calls
    refreshBalance();
    refreshTransactions();
  }, [selectedNetwork.id]); // Remove function dependencies to prevent excessive calls

  // Removed token availability check - now showing total portfolio

  // Get organized networks for the config modal
  const mainnetNetworks = useMemo(() => getMainnetNetworks(), []);
  const testnetNetworks = useMemo(() => getTestnetNetworks(), []);

  // Removed selectedTokenBalance calculation - now showing total portfolio value

  // Calculate real transaction stats from actual data
  const transactionStats = useMemo(() => {
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalVolume: 0,
        sentCount: 0,
        receivedCount: 0,
      };
    }

    const sent = transactions.filter((tx) => tx.type === "send");
    const received = transactions.filter((tx) => tx.type === "receive");

    // Calculate total volume in USD (approximate)
    let totalVolume = 0;
    transactions.forEach((tx) => {
      const amount = parseFloat(tx.value);
      if (!isNaN(amount)) {
        // For stablecoins, assume 1:1 USD
        if (["USDC", "USDT", "DAI"].includes(tx.tokenSymbol)) {
          totalVolume += amount;
        }
      }
    });

    return {
      totalTransactions: transactions.length,
      totalVolume,
      sentCount: sent.length,
      receivedCount: received.length,
    };
  }, [transactions]);

  const handleNetworkConfigSelect = async (networkId: SupportedNetworkId) => {
    try {
      await switchNetwork(networkId);
      setShowNetworkConfig(false); // Close modal after selection

      // Network switched successfully
      console.log("Switched to network:", networkId);
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  // Removed handleTokenSelect - now only displaying balances, no selection

  const handleNetworkExpand = (networkId: string) => {
    setExpandedNetworkId(expandedNetworkId === networkId ? null : networkId);
  };

  const renderNetworkConfigItem = (network: WalletNetwork) => {
    const isActive = selectedNetwork.id === network.id;
    const isExpanded = expandedNetworkId === network.id;
    const icon = getNetworkIcon(network.id);
    const color = getNetworkColor(network.id);

    // Get all available tokens for this network (native + stablecoins)
    const availableTokens = [
      {
        symbol: network.primaryCurrency,
        name: network.primaryCurrency,
        isNative: true,
      },
      ...(network.stablecoins || []).map((coin) => ({
        symbol: coin.symbol,
        name: coin.name,
        isNative: false,
      })),
    ];

    return (
      <View key={network.id}>
        <Pressable
          style={[styles.networkCard, isActive && styles.activeNetworkCard]}
          onPress={() =>
            isActive
              ? handleNetworkExpand(network.id)
              : handleNetworkConfigSelect(network.id)
          }
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

        {/* Token Balances Display - only show for active network when expanded */}
        {isActive && isExpanded && (
          <View style={styles.tokenSelectionContainer}>
            <Text style={styles.tokenSelectionTitle}>Token Balances:</Text>
            {availableTokens.map((token) => {
              // Get balance for this token
              let tokenBalance = "0.00";
              let tokenUsdValue = "0.00";

              if (token.isNative) {
                // Native token - use proper formatting for small amounts
                tokenBalance = formatBalanceForUI(balances.primary);
                tokenUsdValue = balances.primaryUsd.toFixed(2);
              } else {
                // Find stablecoin balance
                const stablecoin = balances.tokens.find(
                  (t) => t.symbol === token.symbol
                );
                if (stablecoin) {
                  tokenBalance = formatBalanceForUI(
                    parseFloat(stablecoin.balance)
                  );
                  tokenUsdValue = (stablecoin.usdValue || 0).toFixed(2);
                }
              }

              return (
                <View key={token.symbol} style={styles.tokenBalanceItem}>
                  <View style={styles.tokenInfo}>
                    <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                    <Text style={styles.tokenName}>
                      {token.name} {token.isNative ? "(Native)" : ""}
                    </Text>
                  </View>
                  <View style={styles.tokenBalanceInfo}>
                    <Text style={styles.tokenBalanceAmount}>
                      {tokenBalance} {token.symbol}
                    </Text>
                    <Text style={styles.tokenBalanceUsd}>
                      ${tokenUsdValue} USD
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const handleQuickAction = (id: string) => {
    switch (id) {
      case "send":
        navigateInstant("WalletTab", { screen: "SendPayment" });
        break;
      case "request":
        navigateInstant("WalletTab", { screen: "ReceivePayment" });
        break;
      case "buysell":
        navigateInstant("TradeTab", { screen: "TradeHome" });
        break;
      case "document":
        navigateInstant("WalletTab", { screen: "DocumentCenter" });
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

        {/* Balance Card - Total Portfolio Value */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Total Portfolio Value</Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  // Instant refresh - immediate UI feedback
                  refreshBalanceInstant();
                  refreshTransactionsInstant();
                }}
                style={[
                  styles.refreshButton,
                  (isRefreshingBalance || isRefreshingTransactions) &&
                    styles.refreshButtonActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    isRefreshingBalance || isRefreshingTransactions
                      ? "loading"
                      : "refresh"
                  }
                  size={20}
                  color={palette.white}
                />
              </Pressable>
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
          </View>
          <Text style={styles.balanceAmount}>${balances.usd.toFixed(2)}</Text>
          <Text style={styles.balanceUsd}>Total USD Value</Text>

          {/* Last Update Indicator */}
          {lastBalanceUpdate && (
            <Text style={styles.lastUpdated}>
              {isRefreshingBalance
                ? "Updating..."
                : `Updated ${getTimeAgo(lastBalanceUpdate)}`}
            </Text>
          )}

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
              <Text style={styles.balanceActionText}>Send Funds</Text>
            </Pressable>
            <Pressable
              style={styles.balanceActionButton}
              onPress={() =>
                navigation.navigate("WalletTab", { screen: "ReceivePayment" })
              }
            >
              <Text style={styles.balanceActionText}>Receive Funds</Text>
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
              <Text style={styles.quickActionLabel}>Send</Text>
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
              <Text style={styles.quickActionLabel}>Receive</Text>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() => handleQuickAction("buysell")}
            >
              <View style={styles.quickActionIcon}>
                <MaterialCommunityIcons
                  name="bank-transfer"
                  size={24}
                  color={palette.accentGreen}
                />
              </View>
              <Text style={styles.quickActionLabel}>Trade Finance</Text>
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

          {isLoadingTransactions && transactions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <MaterialCommunityIcons
                name="loading"
                size={24}
                color={palette.primaryBlue}
              />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.noTransactionsContainer}>
              <MaterialCommunityIcons
                name="history"
                size={48}
                color={palette.neutralMid}
              />
              <Text style={styles.noTransactionsTitle}>
                No Transactions Yet
              </Text>
              <Text style={styles.noTransactionsSubtitle}>
                Your transaction history will appear here once you start using
                your wallet.
              </Text>
            </View>
          ) : (
            transactions.slice(0, 4).map((transaction) => {
              const formatted =
                realTransactionService.formatTransactionForDisplay(transaction);
              return (
                <Pressable
                  key={transaction.id}
                  style={styles.transactionItem}
                  onPress={() =>
                    navigation.navigate("WalletTab", {
                      screen: "TransactionDetails",
                      params: { id: transaction.hash },
                    })
                  }
                >
                  <View
                    style={[
                      styles.transactionIcon,
                      { backgroundColor: formatted.color + "20" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={formatted.icon as any}
                      color={formatted.color}
                      size={20}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                      {formatted.title}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatted.date} • {transaction.status}
                    </Text>
                    <Text style={styles.transactionSubtitle}>
                      {formatted.subtitle}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color: formatted.color,
                      },
                    ]}
                  >
                    {formatted.amount}
                  </Text>
                </Pressable>
              );
            })
          )}
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
}

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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  refreshButton: {
    padding: spacing.xs,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  refreshButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
  lastUpdated: {
    color: palette.white,
    fontSize: 12,
    opacity: 0.7,
    marginTop: spacing.xs,
    fontStyle: "italic",
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
  // Balance Stats Styles (inside balance card)
  balanceStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  balanceStatItem: {
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  balanceStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: spacing.sm,
  },
  balanceStatValue: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "700",
  },
  balanceStatLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
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
  // Token Selection Styles
  tokenSelectionContainer: {
    backgroundColor: palette.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  tokenSelectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.sm,
  },
  tokenItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  selectedTokenItem: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: palette.primaryBlue,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  tokenName: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  selectedTokenText: {
    color: palette.primaryBlue,
  },
  // Token Balance Display Styles
  tokenBalanceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  tokenBalanceInfo: {
    alignItems: "flex-end",
  },
  tokenBalanceAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  tokenBalanceUsd: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  // Real transaction and loading styles
  loadingContainer: {
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: palette.neutralMid,
    textAlign: "center",
  },
  noTransactionsContainer: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  noTransactionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.neutralDark,
    textAlign: "center",
  },
  noTransactionsSubtitle: {
    fontSize: 14,
    color: palette.neutralMid,
    textAlign: "center",
    lineHeight: 20,
  },
  transactionSubtitle: {
    fontSize: 11,
    color: palette.neutralMid,
    marginTop: 2,
  },
});

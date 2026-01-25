import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { ethers } from "ethers";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WalletStackParamList } from "@/navigation/types";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { CompactNetworkTokenSelector } from "../../components/ui/CompactNetworkTokenSelector";
import { TokenInfo } from "../../components/ui/TokenSelector";
import { colors, palette } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import {
  useWallet,
  SupportedNetworkId,
  getAllSupportedTokens,
} from "@/contexts/WalletContext";
import {
  stakingService,
  StakeInfo,
  StakingConfig,
  Proposal,
  DAOStats,
  DAOConfig,
  AllStakesInfo,
  RevocationStatus,
} from "@/services/stakingService";
import {
  getSupportedStablecoins,
  convertToUSD,
  StablecoinConfig,
} from "@/config/stablecoinPrices";

const { width } = Dimensions.get("window");

type NavigationProp = StackNavigationProp<
  WalletStackParamList,
  "TreasuryPortal"
>;
type RouteProps = RouteProp<WalletStackParamList, "TreasuryPortal">;

// Modern Tab Button Component
const TabButton = ({ icon, label, value, active, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.tabButton, active && styles.tabButtonActive]}
  >
    <View
      style={[
        styles.tabButtonGradient,
        { backgroundColor: active ? palette.primaryBlue : "#FFFFFF" },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={active ? "#FFFFFF" : "#6B7280"}
      />
      <Text
        style={[styles.tabButtonText, active && styles.tabButtonTextActive]}
      >
        {label}
      </Text>
    </View>
  </TouchableOpacity>
);

// Action Mode Button Component
const ActionModeButton = ({ icon, label, value, active, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.actionModeButton, active && styles.actionModeButtonActive]}
  >
    <MaterialCommunityIcons
      name={icon}
      size={18}
      color={active ? "#FFFFFF" : "#6B7280"}
    />
    <Text
      style={[styles.actionModeText, active && styles.actionModeTextActive]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// Stat Card Component
const StatCard = ({ icon, label, value, suffix }: any) => {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={palette.primaryBlue}
        />
        <Text style={styles.statCardLabel}>{label}</Text>
      </View>
      <View style={styles.statCardValueRow}>
        <Text style={styles.statCardValue}>{value}</Text>
        {suffix && <Text style={styles.statCardSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
};

export function TreasuryPortalScreenRedesigned() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { selectedNetwork, isUnlocked, address, switchNetwork } = useWallet();

  // State management
  const [activeTab, setActiveTab] = useState<
    "stake" | "create" | "vote" | "pool"
  >("stake");
  const [actionMode, setActionMode] = useState<"stake" | "unstake">("stake");
  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<StablecoinConfig | null>(
    null,
  );
  const [supportedTokens, setSupportedTokens] = useState<StablecoinConfig[]>(
    [],
  );
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [stakeAsFinancier, setStakeAsFinancier] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);

  // Portfolio data
  const [userTotalStakedUSD, setUserTotalStakedUSD] = useState<number>(0);
  const [userVotingPowerPercentage, setUserVotingPowerPercentage] =
    useState<number>(0);
  const [globalPoolTotalUSD, setGlobalPoolTotalUSD] = useState<number>(0);
  const [currentAPR, setCurrentAPR] = useState(0);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [isFinancier, setIsFinancier] = useState(false);
  const [stakeInfo, setStakeInfo] = useState<any>(null);

  // Network configuration
  const networks = [
    {
      id: "sepolia",
      name: "Ethereum Sepolia",
      chainId: 11155111,
      color: "#627EEA",
    },
    {
      id: "lisk-sepolia",
      name: "Lisk Sepolia",
      chainId: 4202,
      color: "#0066FF",
    },
    {
      id: "base-sepolia",
      name: "Base Sepolia",
      chainId: 84532,
      color: "#0052FF",
    },
  ];

  // Initialize
  useEffect(() => {
    loadInitialData();
  }, [isUnlocked, selectedNetwork, address]);

  useEffect(() => {
    const tokens = getSupportedStablecoins(selectedNetwork.chainId);
    setSupportedTokens(tokens);
    if (tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens[0]);
    }
  }, [selectedNetwork]);

  const loadInitialData = async () => {
    if (!isUnlocked || !address) return;

    try {
      setIsLoading(true);
      await Promise.all([
        loadStakingData(),
        loadBalances(),
        loadFinancierStatus(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStakingData = async () => {
    try {
      const info = await stakingService.getStakeInfo(address!);
      setStakeInfo(info);

      // Calculate totals from StakeInfo.amount
      const totalStaked = parseFloat(
        ethers.utils.formatUnits(info.amount || "0", 6),
      );
      setUserTotalStakedUSD(totalStaked);

      // Get APR from config - use initialApr instead of baseAPR
      const config = await stakingService.getStakingConfig();
      setCurrentAPR(config.initialApr / 100);

      // Calculate voting power (example: based on stake percentage)
      const poolTotal = globalPoolTotalUSD || 1000000; // fallback
      setUserVotingPowerPercentage((totalStaked / poolTotal) * 100);
    } catch (error) {
      console.error("Error loading staking data:", error);
    }
  };

  const loadBalances = async () => {
    if (!selectedToken || !address) return;

    try {
      // Get token balance using ethers provider
      const signer = await stakingService.getSigner();
      const provider = signer.provider;
      if (!provider) throw new Error("Provider not available");

      const tokenContract = new ethers.Contract(
        selectedToken.address,
        ["function balanceOf(address) view returns (uint256)"],
        provider,
      );
      const balance = await tokenContract.balanceOf(address);
      setTokenBalance(
        ethers.utils.formatUnits(balance, selectedToken.decimals),
      );
    } catch (error) {
      console.error("Error loading balance:", error);
    }
  };

  const loadFinancierStatus = async () => {
    if (!address) return;

    try {
      const status = await stakingService.isFinancier(address);
      setIsFinancier(status);
    } catch (error) {
      console.error("Error checking financier status:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInitialData();
    setIsRefreshing(false);
  };

  const handleStake = async () => {
    if (!selectedToken || !stakeAmount || parseFloat(stakeAmount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid stake amount");
      return;
    }

    try {
      setIsTransacting(true);

      if (stakeAsFinancier) {
        await stakingService.stakeAsFinancier(stakeAmount, (stage, message) =>
          console.log(`[Stake] ${stage}: ${message}`),
        );
      } else {
        await stakingService.stake(stakeAmount, (stage, message) =>
          console.log(`[Stake] ${stage}: ${message}`),
        );
      }

      Alert.alert("Success", "Stake successful!");
      setStakeAmount("");
      await loadInitialData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to stake");
    } finally {
      setIsTransacting(false);
    }
  };

  const handleUnstake = async () => {
    if (!selectedToken || !stakeAmount || parseFloat(stakeAmount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid unstake amount");
      return;
    }

    try {
      setIsTransacting(true);
      await stakingService.unstake(stakeAmount, (stage, message) =>
        console.log(`[Unstake] ${stage}: ${message}`),
      );

      Alert.alert("Success", "Unstake successful!");
      setStakeAmount("");
      await loadInitialData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to unstake");
    } finally {
      setIsTransacting(false);
    }
  };

  const handleEmergencyWithdraw = async () => {
    Alert.alert(
      "Emergency Withdrawal",
      "This will incur a 10% penalty. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            try {
              setIsTransacting(true);
              await stakingService.emergencyWithdraw((stage, message) => {
                console.log(`[EmergencyWithdraw] ${stage}: ${message}`);
              });
              Alert.alert("Success", "Emergency withdrawal completed");
              setStakeAmount("");
              await loadInitialData();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to withdraw");
            } finally {
              setIsTransacting(false);
            }
          },
        },
      ],
    );
  };

  const handleMaxAmount = () => {
    if (actionMode === "stake") {
      setStakeAmount(tokenBalance);
    } else {
      const staked = parseFloat(
        ethers.utils.formatUnits(stakeInfo?.amount || "0", 6),
      );
      setStakeAmount(staked.toString());
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Compact Network & Token Selector */}
      <View style={styles.compactSelectorContainer}>
        <CompactNetworkTokenSelector
          selectedNetworkId={selectedNetwork.id as SupportedNetworkId}
          selectedToken={selectedToken}
          onNetworkChange={(networkId) => {
            // Network change will be handled by the component
            const tokens = getAllSupportedTokens(networkId);
            if (tokens.length > 0) {
              const firstToken: StablecoinConfig = {
                symbol: tokens[0].symbol,
                name: tokens[0].name,
                address: tokens[0].address,
                decimals: tokens[0].decimals,
                targetPeg: 1.0,
              };
              setSelectedToken(firstToken);
            }
          }}
          onTokenChange={(token) => {
            const stablecoin: StablecoinConfig = {
              symbol: token.symbol,
              name: token.name,
              address: token.address,
              decimals: token.decimals,
              targetPeg: 1.0,
            };
            setSelectedToken(stablecoin);
          }}
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBackground}>
          <TabButton
            icon="wallet"
            label="Stake"
            value="stake"
            active={activeTab === "stake"}
            onPress={() => setActiveTab("stake")}
          />
          <TabButton
            icon="plus-circle"
            label="Create"
            value="create"
            active={activeTab === "create"}
            onPress={() => setActiveTab("create")}
          />
          <TabButton
            icon="vote"
            label="Vote"
            value="vote"
            active={activeTab === "vote"}
            onPress={() => setActiveTab("vote")}
          />
          <TabButton
            icon="shield-check"
            label="Pool"
            value="pool"
            active={activeTab === "pool"}
            onPress={() => setActiveTab("pool")}
          />
        </View>
      </View>
    </View>
  );

  const renderStakeTab = () => (
    <View style={styles.content}>
      {/* Portfolio Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <MaterialCommunityIcons
            name="trending-up"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.heroLabel}>Total Portfolio Value</Text>
        </View>
        <Text style={styles.heroValue}>
          $
          {userTotalStakedUSD.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        <Text style={styles.heroSubtext}>Across all networks</Text>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            icon="vote"
            label="Voting Power"
            value={userVotingPowerPercentage.toFixed(2)}
            suffix="%"
          />
          <StatCard
            icon="trending-up"
            label="APR"
            value={currentAPR.toFixed(1)}
            suffix="%"
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="shield-check"
            label="Global Pool"
            value={`$${(globalPoolTotalUSD / 1000).toFixed(0)}k`}
          />
          <StatCard
            icon="wallet"
            label="Available"
            value={parseFloat(tokenBalance).toFixed(0)}
            suffix={selectedToken?.symbol}
          />
        </View>
      </View>

      {/* Status Badge */}
      <View style={styles.statusCard}>
        <View style={styles.statusLeft}>
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: palette.primaryBlue },
            ]}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="#FFFFFF"
            />
          </View>
          <View>
            <Text style={styles.statusTitle}>Account Status</Text>
            <Text style={styles.statusSubtitle}>
              {isFinancier ? "Active Financier" : "Standard User"}
            </Text>
          </View>
        </View>
        {isFinancier && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: palette.primaryBlue },
            ]}
          >
            <Text style={styles.statusBadgeText}>FINANCIER</Text>
          </View>
        )}
      </View>

      {/* Action Mode Selector */}
      <View style={styles.actionModeCard}>
        <Text style={styles.actionModeLabel}>Action</Text>
        <View style={styles.actionModeButtons}>
          <ActionModeButton
            icon="plus"
            label="Stake"
            value="stake"
            active={actionMode === "stake"}
            onPress={() => setActionMode("stake")}
          />
          <ActionModeButton
            icon="minus"
            label="Unstake"
            value="unstake"
            active={actionMode === "unstake"}
            onPress={() => setActionMode("unstake")}
          />
        </View>
      </View>

      {/* Stake Input Section */}
      {actionMode === "stake" && (
        <View style={styles.inputCard}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Amount to Stake</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={stakeAmount}
                onChangeText={setStakeAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={styles.maxButton}
                onPress={handleMaxAmount}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputInfo}>
              <Text style={styles.inputInfoText}>
                Min: 10 {selectedToken?.symbol}
              </Text>
              <Text style={styles.inputInfoText}>Lock: 90 days</Text>
            </View>
          </View>

          {/* Financier Option */}
          <TouchableOpacity
            style={styles.financierOption}
            onPress={() => setStakeAsFinancier(!stakeAsFinancier)}
          >
            <MaterialCommunityIcons
              name={
                stakeAsFinancier ? "checkbox-marked" : "checkbox-blank-outline"
              }
              size={20}
              color="#2563EB"
            />
            <View style={styles.financierOptionText}>
              <Text style={styles.financierOptionTitle}>
                Stake as Financier
              </Text>
              <Text style={styles.financierOptionDescription}>
                Grant voting rights and governance access (min 1,000{" "}
                {selectedToken?.symbol})
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: palette.primaryBlue },
            ]}
            onPress={handleStake}
            disabled={isTransacting}
          >
            <View style={styles.actionButtonGradient}>
              {isTransacting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="plus"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionButtonText}>
                    Stake {selectedToken?.symbol}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information"
              size={16}
              color="#D97706"
            />
            <Text style={styles.infoBoxText}>
              Your stake will be locked for 90 days. Early withdrawal incurs a
              10% penalty.
            </Text>
          </View>
        </View>
      )}

      {/* Unstake Section */}
      {actionMode === "unstake" && (
        <View style={styles.inputCard}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Amount to Unstake</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={stakeAmount}
                onChangeText={setStakeAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={styles.maxButton}
                onPress={handleMaxAmount}
              >
                <Text style={styles.maxButtonText}>MAX</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputInfo}>
              <Text style={styles.inputInfoText}>
                Staked: {userTotalStakedUSD.toFixed(2)} {selectedToken?.symbol}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.unstakeButtons}>
            <TouchableOpacity
              style={[styles.unstakeButton, { flex: 1 }]}
              onPress={handleUnstake}
              disabled={isTransacting}
            >
              <MaterialCommunityIcons name="minus" size={20} color="#FFFFFF" />
              <Text style={styles.unstakeButtonText}>Unstake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emergencyButton, { flex: 1 }]}
              onPress={handleEmergencyWithdraw}
              disabled={isTransacting}
            >
              <MaterialCommunityIcons
                name="alert-circle"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.emergencyButtonText}>Emergency</Text>
            </TouchableOpacity>
          </View>

          {/* Warning Box */}
          <View style={styles.warningBox}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={16}
              color="#DC2626"
            />
            <Text style={styles.warningBoxText}>
              Emergency withdrawal available with 10% penalty. Regular unstaking
              is locked for 45 more days.
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderOtherTabs = () => (
    <View style={styles.placeholderCard}>
      <View style={styles.placeholderIcon}>
        <MaterialCommunityIcons
          name={
            activeTab === "create"
              ? "plus-circle"
              : activeTab === "vote"
                ? "vote"
                : "shield-check"
          }
          size={32}
          color="#9CA3AF"
        />
      </View>
      <Text style={styles.placeholderTitle}>
        {activeTab === "create" && "Create Proposal"}
        {activeTab === "vote" && "Vote on Proposals"}
        {activeTab === "pool" && "Pool Guarantee"}
      </Text>
      <Text style={styles.placeholderText}>
        This section is under development
      </Text>
    </View>
  );

  if (!isUnlocked) {
    return (
      <Screen>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="lock"
            size={64}
            color={palette.neutralMid}
          />
          <Text style={styles.emptyStateText}>Please unlock your wallet</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen preset="scroll" backgroundColor={palette.surface}>
      <StatusBar style="dark" />
      {renderHeader()}
      {activeTab === "stake" ? renderStakeTab() : renderOtherTabs()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyStateText: {
    fontSize: 16,
    color: palette.neutralMid,
    marginTop: spacing.md,
  },
  // Header
  header: {
    gap: spacing.md,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  headerTitleText: {
    fontSize: 24,
  },
  headerSubtitleText: {
    fontSize: 16,
  },
  // Compact Selector
  compactSelectorContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  // Selection Card (like Receive Payment)
  selectionCard: {
    backgroundColor: palette.white,
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  selectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  selectorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  selectorSubtitle: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  // Network Selector (deprecated, keeping for compatibility)
  networkSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.white,
    borderColor: palette.neutralLighter,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  networkSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  networkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  networkName: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  networkChainId: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  // Token Selector (deprecated, keeping for compatibility)
  tokenSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.white,
    borderColor: palette.neutralLighter,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  tokenSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tokenIconText: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.white,
  },
  tokenSymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  tokenBalance: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  // Tab Container
  tabContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tabBackground: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    padding: 6,
    borderRadius: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
  },
  tabButtonGradient: {
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  // Content
  content: {
    padding: 24,
    gap: 16,
  },
  // Hero Card
  heroCard: {
    backgroundColor: palette.primaryBlue,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    opacity: 0.9,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#FFFFFF",
    height: 30,
  },
  heroSubtext: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.8,
  },
  // Stats Grid
  statsGrid: {
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    padding: spacing.md,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.neutralMid,
  },
  statCardValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.primaryBlue,
  },
  statCardSuffix: {
    fontSize: 14,
    color: palette.neutralMid,
  },
  // Status Card
  statusCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    padding: spacing.md,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  statusSubtitle: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  statusBadge: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.white,
  },
  // Action Mode
  actionModeCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    padding: spacing.lg,
  },
  actionModeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.md,
  },
  actionModeButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionModeButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: 12,
  },
  actionModeButtonActive: {
    backgroundColor: palette.primaryBlue,
  },
  actionModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralMid,
  },
  actionModeTextActive: {
    color: palette.white,
  },
  // Input Card
  inputCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    padding: spacing.lg,
    gap: spacing.md,
  },
  inputSection: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    fontSize: 24,
    fontWeight: "700",
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.neutralLighter,
    borderRadius: 12,
    padding: spacing.md,
    paddingRight: 80,
    color: palette.neutralDark,
  },
  maxButton: {
    position: "absolute",
    right: spacing.md,
    top: "50%",
    transform: [{ translateY: -16 }],
    backgroundColor: palette.primaryBlue,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.white,
  },
  inputInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  inputInfoText: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  // Financier Option
  financierOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderColor: palette.neutralLighter,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  financierOptionText: {
    flex: 1,
  },
  financierOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  financierOptionDescription: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 4,
  },
  // Action Button
  actionButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  actionButtonGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.white,
  },
  // Info/Warning Boxes
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: "#FFF9E6",
    borderColor: palette.warningYellow,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: palette.neutralDark,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: "#FFE6E6",
    borderColor: palette.errorRed,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  warningBoxText: {
    flex: 1,
    fontSize: 12,
    color: palette.errorRed,
    lineHeight: 18,
  },
  // Unstake Buttons
  unstakeButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  unstakeButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.warningYellow,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  unstakeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.white,
  },
  emergencyButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.errorRed,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.white,
  },
  // Placeholder
  placeholderCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    padding: spacing.xl * 2,
    alignItems: "center",
    margin: spacing.lg,
  },
  placeholderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    color: palette.neutralMid,
  },
});

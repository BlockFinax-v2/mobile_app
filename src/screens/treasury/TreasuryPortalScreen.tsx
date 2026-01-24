import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { ethers } from "ethers";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WalletStackParamList } from "@/navigation/types";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { NetworkSelector } from "@/components/ui/NetworkSelector";
import { TokenSelector, TokenInfo } from "@/components/ui/TokenSelector";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import {
  useWallet,
  SupportedNetworkId,
  getAllSupportedTokens,
} from "@/contexts/WalletContext";
import {
  stakingService,
  StakeInfo,
  PoolStats,
  StakingConfig,
  StakingTransaction,
  Proposal,
  DAOStats,
  DAOConfig,
  AllStakesInfo,
  TokenStakeInfo,
  RevocationStatus,
} from "@/services/stakingService";
import { isStakingSupportedOnNetwork } from "@/services/multiNetworkStakingService";
import {
  getSupportedStablecoins,
  convertToUSD,
  StablecoinConfig,
} from "@/config/stablecoinPrices";
import { performanceCache } from "@/utils/performanceCache";
import { asyncQueue, TaskPriority, debounce } from "@/utils/asyncQueue";
import { withOptimisticUpdate } from "@/utils/optimisticUpdate";
import { dataPreloader } from "@/utils/dataPreloader";
import {
  Skeleton,
  SkeletonCard,
  SkeletonStatsGrid,
  SkeletonProposalCard,
  SkeletonList,
} from "@/components/ui/SkeletonLoader";
import { FinancierRevocationPanel } from "@/components/treasury/FinancierRevocationPanel";
import { CustomDeadlineModal } from "@/components/treasury/CustomDeadlineModal";

type NavigationProp = StackNavigationProp<
  WalletStackParamList,
  "TreasuryPortal"
>;
type RouteProps = RouteProp<WalletStackParamList, "TreasuryPortal">;

export function TreasuryPortalScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  // Navigation and wallet state
  const [activeTab, setActiveTab] = useState<
    "stake" | "create" | "vote" | "pool"
  >("stake");
  const { selectedNetwork, isUnlocked, address, switchNetwork } = useWallet();

  // Real staking state
  const [isLoading, setIsLoading] = useState(true);
  const [isTransacting, setIsTransacting] = useState(false);
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [stakingConfig, setStakingConfig] = useState<StakingConfig | null>(
    null,
  );
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [currentAPR, setCurrentAPR] = useState(0);

  // Transaction state
  const [pendingTx, setPendingTx] = useState<StakingTransaction | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [stakingProgress, setStakingProgress] = useState<string>("");

  // Create Proposal state
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalCategory, setProposalCategory] = useState<
    "Treasury" | "Investment" | "Guarantee"
  >("Treasury");

  // Governance state
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [daoStats, setDAOStats] = useState<DAOStats | null>(null);
  const [daoConfig, setDAOConfig] = useState<DAOConfig | null>(null);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);

  // Financier state
  const [isApplyingFinancier, setIsApplyingFinancier] = useState(false);
  const [isFinancier, setIsFinancier] = useState(false);
  const [stakeAsFinancier, setStakeAsFinancier] = useState(false);

  // Revocation state
  const [revocationStatus, setRevocationStatus] =
    useState<RevocationStatus | null>(null);
  const [isRevocationPending, setIsRevocationPending] = useState(false);
  const [showRevocationModal, setShowRevocationModal] = useState(false);

  // Custom deadline state
  const [customDeadlineDays, setCustomDeadlineDays] = useState(0);
  const [showCustomDeadlineModal, setShowCustomDeadlineModal] = useState(false);

  // Multi-token state
  const [selectedToken, setSelectedToken] = useState<StablecoinConfig | null>(
    null,
  );
  const [supportedTokens, setSupportedTokens] = useState<StablecoinConfig[]>(
    [],
  );
  const [multiTokenStakes, setMultiTokenStakes] =
    useState<AllStakesInfo | null>(null);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>(
    {},
  );
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [poolTokenStats, setPoolTokenStats] = useState<{
    [tokenAddress: string]: { amount: string; usdValue: number };
  }>({});
  const [totalPoolUSD, setTotalPoolUSD] = useState<number>(0);

  // Cross-network aggregated stats
  const [userTotalStakedUSD, setUserTotalStakedUSD] = useState<number>(0);
  const [userStakesByNetwork, setUserStakesByNetwork] = useState<
    Record<
      number,
      {
        tokens: Array<{ symbol: string; amount: string; usdValue: number }>;
        totalUSD: number;
      }
    >
  >({});
  const [globalPoolTotalUSD, setGlobalPoolTotalUSD] = useState<number>(0);
  const [userVotingPowerPercentage, setUserVotingPowerPercentage] =
    useState<number>(0);

  // Performance: Track loading states separately
  const [dataVersion, setDataVersion] = useState(0);
  const isInitialMount = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializing = useRef(false); // Prevent concurrent initialization

  // Network and Token Selector state
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [currentNetworkId, setCurrentNetworkId] = useState<SupportedNetworkId>(
    selectedNetwork.id,
  );
  const isInitialized = useRef(false); // Track if service is already initialized

  // Initialize staking service with user's actual wallet credentials
  // 🚀 OPTIMIZED: Singleton pattern to prevent multiple initializations
  const initializeStakingService = useCallback(async () => {
    // Skip if already initialized or currently initializing
    if (isInitialized.current || isInitializing.current) {
      console.log("[Perf] Staking service already initialized, skipping...");
      return;
    }

    try {
      if (!isUnlocked) {
        console.log("Wallet is locked, cannot initialize staking service");
        return;
      }

      isInitializing.current = true;
      console.log(
        "Initializing staking service with user's wallet credentials...",
      );

      // Set current network in staking service
      stakingService.setNetwork(selectedNetwork.chainId, selectedNetwork);
      console.log(
        `[StakingService] Configured for network: ${selectedNetwork.name} (chainId: ${selectedNetwork.chainId})`,
      );

      const signer = await stakingService.getSigner();
      const signerAddress = await signer.getAddress();
      console.log("Staking service connected with user wallet:", signerAddress);

      isInitialized.current = true;
    } catch (error) {
      console.error("Failed to initialize staking service:", error);
      throw error;
    } finally {
      isInitializing.current = false;
    }
  }, [isUnlocked, selectedNetwork]);

  // Available tokens for current network
  const availableTokens = useMemo(() => {
    return getAllSupportedTokens(currentNetworkId);
  }, [currentNetworkId]);

  // Network selection handler
  const handleNetworkSelect = useCallback(
    async (networkId: SupportedNetworkId) => {
      setCurrentNetworkId(networkId);
      setShowNetworkSelector(false);

      // Switch wallet network if needed
      const networkToSwitch = [
        {
          id: "lisk-sepolia" as SupportedNetworkId,
          name: "Lisk Sepolia",
          chainId: 4202,
          rpcUrl: "https://rpc.sepolia-api.lisk.com",
        },
        {
          id: "base-sepolia" as SupportedNetworkId,
          name: "Base Sepolia",
          chainId: 84532,
          rpcUrl: "https://sepolia.base.org",
        },
        {
          id: "sepolia" as SupportedNetworkId,
          name: "Sepolia",
          chainId: 11155111,
          rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
        },
      ].find((n) => n.id === networkId);

      if (networkToSwitch && selectedNetwork.id !== networkId) {
        try {
          await switchNetwork(networkToSwitch.id);
          // Reload data after network switch
          await loadMultiTokenData();
          await loadStakingData();
        } catch (error) {
          console.error("Failed to switch network:", error);
        }
      }
    },
    [selectedNetwork.id, switchNetwork],
  );

  // Token selection handler
  const handleTokenSelect = useCallback(
    (token: TokenInfo) => {
      // Find the corresponding StablecoinConfig
      const stablecoinConfig = supportedTokens.find(
        (t) => t.address.toLowerCase() === token.address.toLowerCase(),
      );
      if (stablecoinConfig) {
        setSelectedToken(stablecoinConfig);
      }
      setShowTokenSelector(false);
    },
    [supportedTokens],
  );

  // Load multi-token balances and stakes across ALL supported networks
  const loadMultiTokenData = useCallback(async () => {
    if (!isUnlocked || !address) {
      return;
    }

    try {
      console.log(
        "[Multi-Token] Starting cross-network data load for address:",
        address,
      );

      // Load current network tokens first
      const currentNetworkTokens = getSupportedStablecoins(
        selectedNetwork.chainId,
      );
      if (currentNetworkTokens.length > 0) {
        setSupportedTokens(currentNetworkTokens);
        if (!selectedToken) {
          setSelectedToken(currentNetworkTokens[0]);
        }
      }

      // Load data from ALL networks for Global Pool and Voting Power
      const activeChainIds = [11155111, 4202, 84532]; // Ethereum Sepolia, Lisk Sepolia, Base Sepolia

      console.log("[Multi-Token] Loading Global Pool data from all 3 networks");
      console.log(`[Multi-Token] Active chains: ${activeChainIds.join(", ")}`);

      let globalTotalStakedUSD = 0;
      let userTotalVotingPowerAcrossNetworks = 0;
      let totalVotingPowerAcrossNetworks = 0;

      for (const chainId of activeChainIds) {
        console.log(`[Multi-Token] Querying network ${chainId}...`);

        try {
          // Get RPC URL for this chain
          const rpcUrl =
            chainId === 4202
              ? "https://rpc.sepolia-api.lisk.com"
              : chainId === 84532
                ? "https://sepolia.base.org"
                : "https://rpc.sepolia.org";

          // Get Diamond address for this chain
          const diamondAddress =
            chainId === 4202
              ? "0xE133CD2eE4d835AC202942Baff2B1D6d47862d34"
              : chainId === 84532
                ? "0xb899A968e785dD721dbc40e71e2FAEd7B2d84711"
                : "0xA4d19a7b133d2A9fAce5b1ad407cA7b9D4Ee9284";

          // Create provider for this network
          const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

          const governanceABI = [
            "function getTotalStakedUSD() external view returns (uint256)",
          ];

          const contract = new ethers.Contract(
            diamondAddress,
            governanceABI,
            provider,
          );
          const totalStakedUSD = await contract.getTotalStakedUSD();

          const networkTotalStaked = parseFloat(
            ethers.utils.formatEther(totalStakedUSD),
          );
          globalTotalStakedUSD += networkTotalStaked;

          console.log(
            `[Multi-Token] Network ${chainId} - Total Staked: $${networkTotalStaked}`,
          );

          // Get user's stake info for voting power calculation
          const stakeABI = [
            "function getStake(address staker) external view returns (uint256 amount, uint256 timestamp, uint256 votingPower, bool active, uint256 pendingRewards, uint256 timeUntilUnlock, uint256 deadline, bool financierStatus)",
          ];

          const stakeContract = new ethers.Contract(
            diamondAddress,
            stakeABI,
            provider,
          );
          const userStake = await stakeContract.getStake(address);
          const userVotingPower = parseFloat(
            ethers.utils.formatEther(userStake.votingPower),
          );
          userTotalVotingPowerAcrossNetworks += userVotingPower;

          // Total voting power is always 1.0 (100%) per network, so we add 1.0 for each network
          totalVotingPowerAcrossNetworks += 1.0;

          console.log(
            `[Multi-Token] Network ${chainId} - User Voting Power: ${userVotingPower}`,
          );
        } catch (error) {
          console.error(`Failed to load data for chain ${chainId}:`, error);
        }
      }

      console.log(
        "[Multi-Token] Global Total Staked USD:",
        globalTotalStakedUSD,
      );
      console.log(
        "[Multi-Token] User Total Voting Power:",
        userTotalVotingPowerAcrossNetworks,
      );
      console.log(
        "[Multi-Token] Total Voting Power Across Networks:",
        totalVotingPowerAcrossNetworks,
      );

      // Calculate user's voting power percentage
      const userVotingPowerPercentage =
        totalVotingPowerAcrossNetworks > 0
          ? (userTotalVotingPowerAcrossNetworks /
              totalVotingPowerAcrossNetworks) *
            100
          : 0;

      console.log(
        "[Multi-Token] User Voting Power %:",
        userVotingPowerPercentage,
      );

      // Update state
      setGlobalPoolTotalUSD(globalTotalStakedUSD);
      setUserVotingPowerPercentage(userVotingPowerPercentage);

      // Now load CURRENT network data for user's portfolio
      console.log(
        "[Multi-Token] Loading user portfolio from CURRENT network only (chainId: " +
          selectedNetwork.chainId +
          ")",
      );

      // Load user stakes for CURRENT network using unified stakingService
      const stakesData = await stakingService.getAllStakesForUser(address);

      console.log(
        `[Multi-Token] Stakes data for current network:`,
        JSON.stringify(stakesData, null, 2),
      );
      console.log(
        `[Multi-Token] Total USD from contract:`,
        stakesData?.totalUsdValue || "0",
      );

      // Use totalUsdValue directly from contract (already formatted from 18 decimals)
      const userTotalUSD = parseFloat(stakesData?.totalUsdValue || "0");

      console.log(
        "[Multi-Token] Portfolio Value (from current network):",
        userTotalUSD,
      );

      // Update state with data from current network only
      setUserTotalStakedUSD(userTotalUSD);
      setMultiTokenStakes(stakesData);

      // Load balances for all supported tokens on current network
      const currentNetworkTokensList =
        currentNetworkTokens.length > 0
          ? currentNetworkTokens
          : supportedTokens;
      const balances: Record<string, string> = {};

      console.log(
        "[Balance] Loading balances for tokens:",
        currentNetworkTokensList.map((t) => t.symbol),
      );

      await Promise.all(
        currentNetworkTokensList.map(async (token) => {
          try {
            const balance = await stakingService.getUSDCBalance(address);
            balances[token.address] = balance;
            console.log(`[Balance] ${token.symbol} balance: ${balance}`);
          } catch (error) {
            console.error(`Failed to load balance for ${token.symbol}:`, error);
            balances[token.address] = "0";
          }
        }),
      );
      setTokenBalances(balances);
      console.log("[Balance] All balances loaded:", balances);
    } catch (error) {
      console.error("Failed to load multi-token data:", error);
    }
  }, [isUnlocked, address, selectedNetwork.chainId]);

  // 🚀 OPTIMIZED: Only load data for active tab
  const loadStakingData = useCallback(async () => {
    if (!isUnlocked || !address) {
      setIsLoading(false);
      return;
    }

    // Skip if not on stake or pool tab
    if (activeTab !== "stake" && activeTab !== "pool") {
      console.log("[Perf] Skipping staking data load - not on stake/pool tab");
      return;
    }

    try {
      setIsLoading(true);

      // Check if staking is supported on this network
      if (!isStakingSupportedOnNetwork(selectedNetwork.chainId)) {
        console.log(
          `Staking not yet deployed on ${selectedNetwork.name} (chainId: ${selectedNetwork.chainId})`,
        );
        setIsLoading(false);
        return;
      }

      // Load supported tokens for this network
      const tokens = getSupportedStablecoins(selectedNetwork.chainId);
      setSupportedTokens(tokens);
      if (tokens.length > 0 && !selectedToken) {
        setSelectedToken(tokens[0]); // Default to first token (usually USDC)
      }

      // Initialize service only onceB
      await initializeStakingService();

      // Performance: Use cache for frequently accessed data
      const cacheKey = `staking:${address}:${selectedNetwork.chainId}`;
      const cachedData = performanceCache.get<any>(cacheKey);

      if (cachedData) {
        // Use cached data for instant UI
        console.log("[Perf] Using cached staking data for instant load");
        setStakeInfo(cachedData.stake);
        setPoolStats(cachedData.pool);
        setStakingConfig(cachedData.config);
        setUsdcBalance(cachedData.balance);
        setCurrentAPR(cachedData.apr);
        setIsFinancier(cachedData.isEligible);
        setIsLoading(false);
        setDataVersion((v) => v + 1);
        return;
      }

      // Performance: Queue data fetching with priority
      const [stake, pool, config, balance, apr, isEligible] = await Promise.all(
        [
          asyncQueue.enqueue(
            () => stakingService.getStakeInfo(address),
            TaskPriority.HIGH,
          ),
          asyncQueue.enqueue(
            () => stakingService.getStakingConfig(),
            TaskPriority.NORMAL,
          ),
          asyncQueue.enqueue(
            () => stakingService.getStakingConfig(),
            TaskPriority.HIGH,
          ),
          asyncQueue.enqueue(
            () => stakingService.getUSDCBalance(address),
            TaskPriority.NORMAL,
          ),
          asyncQueue.enqueue(
            () => stakingService.calculateCurrentAPR(),
            TaskPriority.LOW,
          ),
          asyncQueue.enqueue(
            () => stakingService.isFinancier(address),
            TaskPriority.HIGH,
          ),
        ],
      );

      // Update state
      setStakeInfo(stake);
      setStakingConfig(config);
      setUsdcBalance(balance);
      setCurrentAPR(apr);
      setIsFinancier(isEligible);
      // Remove poolStats since it's no longer available
      setPoolStats(null);
      // Cache the results (5 minute TTL)
      performanceCache.set(
        cacheKey,
        {
          stake,
          pool,
          config,
          balance,
          apr,
          isEligible,
        },
        5 * 60 * 1000,
      );

      setDataVersion((v) => v + 1);

      // Load multi-token data
      await loadMultiTokenData();
    } catch (error) {
      console.error("Failed to load staking data:", error);
      Alert.alert("Error", "Failed to load staking data. Please try again.");
    } finally {
      setIsLoading(false);
      isInitialMount.current = false;
    }
  }, [
    isUnlocked,
    address,
    selectedNetwork.chainId,
    activeTab,
    initializeStakingService,
  ]);

  // 🚀 OPTIMIZED: Only load governance data when on create or vote tab
  const loadGovernanceData = useCallback(async () => {
    if (!isUnlocked || !address || selectedNetwork.chainId !== 4202) {
      return;
    }

    // Skip if not on create or vote tab
    if (activeTab !== "create" && activeTab !== "vote") {
      console.log(
        "[Perf] Skipping governance data load - not on create/vote tab",
      );
      return;
    }

    try {
      setIsLoadingProposals(true);

      // Initialize service only once
      await initializeStakingService();

      // Performance: Cache governance data
      const cacheKey = `governance:${address}:${selectedNetwork.chainId}`;
      const cachedData = performanceCache.get<any>(cacheKey);

      if (cachedData) {
        console.log("[Perf] Using cached governance data");
        setProposals(cachedData.proposals);
        setDAOStats(cachedData.stats);
        setDAOConfig(cachedData.config);
        setIsLoadingProposals(false);
        return;
      }

      // Performance: Queue governance data fetching
      const [allProposals, stats, config] = await Promise.all([
        asyncQueue.enqueue(
          () => stakingService.getAllProposals(),
          TaskPriority.NORMAL,
        ),
        asyncQueue.enqueue(
          () => stakingService.getDAOStats(),
          TaskPriority.LOW,
        ),
        asyncQueue.enqueue(
          () => stakingService.getDAOConfig(),
          TaskPriority.NORMAL,
        ),
      ]);

      setProposals(allProposals);
      setDAOStats(stats);
      setDAOConfig(config);

      // Cache for 2 minutes
      performanceCache.set(
        cacheKey,
        {
          proposals: allProposals,
          stats,
          config,
        },
        2 * 60 * 1000,
      );
    } catch (error) {
      console.error("Failed to load governance data:", error);
    } finally {
      setIsLoadingProposals(false);
    }
  }, [
    isUnlocked,
    address,
    selectedNetwork.chainId,
    activeTab,
    initializeStakingService,
  ]);

  // 🔄 AUTO-FALLBACK: Switch to Ethereum Sepolia if current network doesn't support staking
  useEffect(() => {
    // Only check if wallet is unlocked and user is on treasury screen
    if (!isUnlocked) return;

    const currentChainId = selectedNetwork.chainId;
    const isSupported = isStakingSupportedOnNetwork(currentChainId);

    if (!isSupported) {
      console.log(
        `⚠️ Staking not supported on ${selectedNetwork.name} (chainId: ${currentChainId}). Switching to Ethereum Sepolia...`,
      );

      // Automatically switch to Ethereum Sepolia for testing
      // This will be Ethereum Mainnet when deploying to production
      switchNetwork("ethereum-sepolia").catch((error) => {
        console.error("Failed to switch network:", error);
      });
    } else {
      // Network changed and is supported - update staking service network and reinitialize
      console.log(
        `[Network Change] Updating staking service to ${selectedNetwork.name} (chainId: ${currentChainId})`,
      );
      stakingService.setNetwork(currentChainId, selectedNetwork);
      isInitialized.current = false; // Force reinitialization on next use
    }
  }, [selectedNetwork.chainId, isUnlocked, switchNetwork, selectedNetwork]);

  // 🚀 OPTIMIZED: Load data only when needed based on active tab
  useEffect(() => {
    if (activeTab === "stake" || activeTab === "pool") {
      loadStakingData();
    } else if (activeTab === "create" || activeTab === "vote") {
      loadGovernanceData();
    }
  }, [activeTab, isUnlocked, address, selectedNetwork.chainId]);

  // 🚀 OPTIMIZED: Removed auto-refresh - use manual refresh or event-based updates only
  // The 30-second auto-refresh was causing performance issues
  // Data will refresh when:
  // 1. User switches tabs
  // 2. User completes a transaction
  // 3. User manually pulls to refresh (if implemented)

  // Handle payment results when returning from payment screens
  useEffect(() => {
    if (route.params?.paymentResult) {
      const { success, paymentType, transactionHash, stakeAmount } =
        route.params.paymentResult;

      if (success) {
        // Reload staking data after successful transaction
        loadStakingData();
        switch (paymentType) {
          case "stake":
            if (stakeAmount) {
              Alert.alert(
                "Staking Successful! 🎉",
                `You have successfully staked ${stakeAmount} USDC!\n\nTransaction Hash: ${transactionHash}\n\nYour voting power has increased and you'll start earning rewards immediately.`,
                [{ text: "OK" }],
              );
            }
            break;

          case "deposit":
            Alert.alert(
              "Deposit Successful! 🎉",
              `Your treasury deposit has been processed successfully!\n\nTransaction Hash: ${transactionHash}`,
              [{ text: "OK" }],
            );
            break;

          case "governance":
            Alert.alert(
              "Governance Payment Successful! 🎉",
              `Your governance payment has been recorded!\n\nTransaction Hash: ${transactionHash}`,
              [{ text: "OK" }],
            );
            break;
        }
      }

      // Clear the payment result params
      navigation.setParams({ paymentResult: undefined } as any);
    }
  }, [route.params?.paymentResult, navigation]);

  // Monitor pending transactions
  useEffect(() => {
    if (!pendingTx) return;

    const monitorTransaction = async () => {
      try {
        console.log(
          `Monitoring ${pendingTx.type} transaction:`,
          pendingTx.hash,
        );
        const receipt = await stakingService.waitForTransaction(pendingTx.hash);

        if (receipt.status === 1) {
          console.log(`Transaction ${pendingTx.type} confirmed successfully`);
          // Events will handle UI updates, but we can show immediate feedback
          setTimeout(() => {
            loadStakingData(); // Refresh data after a short delay
          }, 2000);
        } else {
          // Get detailed failure reason
          const failureReason =
            await stakingService.getTransactionFailureReason(pendingTx.hash);
          console.log(
            `Transaction ${pendingTx.type} failed. Reason:`,
            failureReason,
          );

          Alert.alert(
            "Transaction Failed",
            `Your ${pendingTx.type} transaction failed.\n\nReason: ${failureReason}\n\nTransaction: ${pendingTx.hash}`,
            [{ text: "OK" }],
          );
        }
        setPendingTx(null);
        setIsTransacting(false);
      } catch (error) {
        console.error("Transaction monitoring error:", error);
        Alert.alert(
          "Transaction Error",
          `Transaction may have failed. Please check your wallet and try again if needed.`,
          [{ text: "OK" }],
        );
        setPendingTx(null);
        setIsTransacting(false);
      }
    };

    monitorTransaction();
  }, [pendingTx]);

  // 🔄 AUTO-REFRESH: Refresh data every 30 seconds when screen is focused
  useEffect(() => {
    if (!isUnlocked || !address) return;

    const refreshInterval = setInterval(async () => {
      console.log("[Auto-Refresh] Refreshing treasury data...");
      try {
        await loadMultiTokenData();
        if (activeTab === "stake" || activeTab === "pool") {
          // Only refresh staking data if on relevant tab
          const cacheKey = `staking:${address}:${selectedNetwork.chainId}`;
          performanceCache.invalidate(cacheKey); // Clear cache to force fresh data
        }
      } catch (error) {
        console.error("[Auto-Refresh] Failed to refresh data:", error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [
    isUnlocked,
    address,
    activeTab,
    selectedNetwork.chainId,
    loadMultiTokenData,
  ]);

  // Real staking transaction handlers with optimistic updates
  const handleStakeUSDC = useCallback(async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid stake amount");
      return;
    }

    if (!selectedToken) {
      Alert.alert("Error", "Please select a token to stake");
      return;
    }

    if (!stakingConfig) {
      Alert.alert("Error", "Staking configuration not loaded");
      return;
    }

    // Check minimum stake based on stake type
    const minStake = stakeAsFinancier
      ? parseFloat(stakingConfig.minimumFinancierStake)
      : parseFloat(stakingConfig.minimumStake);

    if (parseFloat(stakeAmount) < minStake) {
      Alert.alert(
        "Minimum Stake Required",
        `Minimum ${
          stakeAsFinancier ? "financier " : ""
        }stake amount is ${minStake} ${selectedToken.symbol}`,
      );
      return;
    }

    // Check token balance
    const tokenBalance = tokenBalances[selectedToken.address] || "0";
    if (parseFloat(tokenBalance) < parseFloat(stakeAmount)) {
      Alert.alert(
        "Insufficient Balance",
        `You don't have enough ${selectedToken.symbol} to stake this amount`,
      );
      return;
    }

    try {
      setIsTransacting(true);
      setStakingProgress("Initializing...");

      // Calculate USD equivalent for the stake
      const usdEquivalent = await convertToUSD(
        parseFloat(stakeAmount),
        selectedToken.symbol,
        selectedNetwork.chainId,
      );

      // Calculate custom deadline (90 days from now)
      const customDeadline = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      setStakingProgress(`Staking ${stakeAmount} ${selectedToken.symbol}...`);

      // Use unified staking service with progress callback
      if (stakeAsFinancier) {
        await stakingService.stakeAsFinancier(stakeAmount, (stage, message) => {
          setStakingProgress(message);
          console.log(`Stake as Financier - ${stage}: ${message}`);
        });
      } else {
        await stakingService.stake(stakeAmount, (stage, message) => {
          setStakingProgress(message);
          console.log(`Stake - ${stage}: ${message}`);
        });
      }

      setStakeAmount(""); // Clear input
      setStakeAsFinancier(false); // Reset checkbox
      setStakingProgress("");

      // Performance: Invalidate cache
      performanceCache.invalidatePattern(`staking:${address}`);

      // Reload data
      await loadMultiTokenData();

      Alert.alert(
        "Stake Submitted",
        `Successfully staked ${stakeAmount} ${selectedToken.symbol}!`,
        [{ text: "OK" }],
      );
    } catch (error: any) {
      console.error("Staking error:", error);
      setStakingProgress("");
      Alert.alert("Staking Failed", error.message);
    } finally {
      setIsTransacting(false);
    }
  }, [
    stakeAmount,
    stakingConfig,
    selectedToken,
    tokenBalances,
    stakeAsFinancier,
    address,
    selectedNetwork.chainId,
    loadMultiTokenData,
  ]);

  const handleUnstake = useCallback(async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid unstake amount");
      return;
    }

    if (!selectedToken) {
      Alert.alert("Error", "Please select a token to unstake");
      return;
    }

    // Find the stake for the selected token
    const tokenIndex = multiTokenStakes?.tokens.findIndex(
      (tokenAddr) =>
        tokenAddr.toLowerCase() === selectedToken.address.toLowerCase(),
    );

    const tokenStakeAmount =
      tokenIndex !== undefined && tokenIndex >= 0 && multiTokenStakes
        ? multiTokenStakes.amounts[tokenIndex]
        : "0";

    if (
      !multiTokenStakes ||
      tokenIndex === undefined ||
      tokenIndex < 0 ||
      parseFloat(unstakeAmount) > parseFloat(tokenStakeAmount)
    ) {
      Alert.alert("Error", "Cannot unstake more than your staked amount");
      return;
    }

    try {
      setIsTransacting(true);

      console.log(
        "Attempting to unstake:",
        unstakeAmount,
        selectedToken.symbol,
      );
      console.log("Token stake amount:", tokenStakeAmount);

      await stakingService.unstake(unstakeAmount, (stage, message) => {
        console.log(`Unstake - ${stage}: ${message}`);
      });

      setUnstakeAmount(""); // Clear input

      // Performance: Invalidate cache
      performanceCache.invalidatePattern(`staking:${address}`);

      // Reload data
      await loadMultiTokenData();

      Alert.alert(
        "Unstake Submitted",
        `Successfully unstaked ${unstakeAmount} ${selectedToken.symbol}!`,
        [{ text: "OK" }],
      );
    } catch (error: any) {
      console.error("Unstake error:", error);
      Alert.alert("Unstaking Failed", error.message);
    } finally {
      setIsTransacting(false);
    }
  }, [
    unstakeAmount,
    selectedToken,
    multiTokenStakes,
    address,
    selectedNetwork.chainId,
    loadMultiTokenData,
  ]);

  const handleClaimRewards = useCallback(async () => {
    if (!selectedToken) {
      Alert.alert("Error", "Please select a token to claim rewards from");
      return;
    }

    try {
      setIsTransacting(true);

      console.log("Attempting to claim rewards for", selectedToken.symbol);

      await stakingService.claimRewards((stage, message) => {
        console.log(`Claim Rewards - ${stage}: ${message}`);
      });

      // Performance: Invalidate cache
      performanceCache.invalidatePattern(`staking:${address}`);

      // Reload data
      await loadMultiTokenData();

      Alert.alert(
        "Claim Submitted",
        `Successfully claimed rewards for ${selectedToken.symbol}!`,
        [{ text: "OK" }],
      );
    } catch (error: any) {
      console.error("Claim rewards error:", error);
      Alert.alert("Claim Failed", error.message);
    } finally {
      setIsTransacting(false);
    }
  }, [selectedToken, address, loadMultiTokenData]);

  const handleEmergencyWithdraw = useCallback(async () => {
    // Check if user has an active stake
    const stakedAmount = parseFloat(stakeInfo?.amount || "0");
    const hasActiveStake = stakeInfo?.active && stakedAmount > 0;

    if (!hasActiveStake) {
      Alert.alert(
        "No Active Stake",
        "You don't have any active stake to withdraw. Please stake some USDC first.",
        [{ text: "OK" }],
      );
      return;
    }

    // Show warning with estimated penalty if we have the info
    const penaltyPercent = stakingConfig?.emergencyWithdrawPenalty || 10; // Default 10%
    const penalty = (stakedAmount * penaltyPercent) / 100;

    Alert.alert(
      "Emergency Withdrawal Warning",
      `This will withdraw your stake with a ${penaltyPercent}% penalty.\n\nStaked Amount: ${stakedAmount.toFixed(
        6,
      )} USDC\nEstimated Penalty: ${penalty.toFixed(
        6,
      )} USDC\nYou'll receive: ~${(stakedAmount - penalty).toFixed(
        6,
      )} USDC\n\nThis action cannot be undone and will be processed immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Emergency Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              setIsTransacting(true);
              await initializeStakingService();

              console.log("Attempting emergency withdrawal...");
              console.log("Current stake info:", stakeInfo);

              const tx = await stakingService.emergencyWithdraw();
              setPendingTx(tx);

              // Performance: Invalidate cache
              performanceCache.invalidatePattern(`staking:${address}`);

              Alert.alert(
                "Emergency Withdrawal Submitted",
                `Emergency withdrawal transaction submitted. Hash: ${tx.hash}`,
                [{ text: "OK" }],
              );
            } catch (error: any) {
              console.error("Emergency withdrawal error:", error);
              Alert.alert("Emergency Withdrawal Failed", error.message);
            } finally {
              setIsTransacting(false);
            }
          },
        },
      ],
    );
  }, [stakeInfo, stakingConfig, address]);

  const handleRefreshData = useCallback(() => {
    // Performance: Clear cache on manual refresh
    performanceCache.clear();
    loadStakingData();
    loadGovernanceData();
  }, [loadStakingData, loadGovernanceData]);

  const handleCreateProposal = useCallback(async () => {
    if (!proposalTitle.trim() || !proposalDescription.trim()) {
      Alert.alert(
        "Missing Information",
        "Please fill in both title and description for your proposal.",
      );
      return;
    }

    // Generate unique proposal ID (use substring instead of deprecated substr)
    const proposalId = `proposal-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    // Trim whitespace from inputs
    const cleanTitle = proposalTitle.trim();
    const cleanDescription = proposalDescription.trim();
    const cleanCategory = proposalCategory; // Already a typed value

    Alert.alert(
      "Submit Proposal",
      `Submit proposal "${cleanTitle}" for voting?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            try {
              setIsTransacting(true);
              await initializeStakingService();

              console.log("📝 Creating proposal with cleaned inputs:");
              console.log("  proposalId:", proposalId);
              console.log("  category:", cleanCategory);
              console.log("  title:", cleanTitle);
              console.log("  description:", cleanDescription);
              console.log("  proposalId length:", proposalId.length);
              console.log("  category length:", cleanCategory.length);
              console.log("  title length:", cleanTitle.length);
              console.log("  description length:", cleanDescription.length);

              const tx = await stakingService.createProposal(
                proposalId,
                cleanCategory,
                cleanTitle,
                cleanDescription,
              );

              setPendingTx(tx);

              Alert.alert(
                "Proposal Submitted!",
                `Your proposal has been submitted to the blockchain.\n\nTransaction Hash: ${tx.hash}\n\nIt will appear in the voting section once confirmed.`,
                [{ text: "OK" }],
              );

              // Reset form
              setProposalTitle("");
              setProposalDescription("");
              setProposalCategory("Treasury");

              // Performance: Invalidate governance cache
              performanceCache.invalidatePattern(`governance:${address}`);

              // Reload proposals after a delay
              setTimeout(() => {
                loadGovernanceData();
              }, 3000);
            } catch (error: any) {
              console.error("Create proposal error:", error);
              Alert.alert(
                "Proposal Creation Failed",
                error.message || "Failed to create proposal",
              );
            } finally {
              setIsTransacting(false);
            }
          },
        },
      ],
    );
  }, [proposalTitle, proposalDescription, proposalCategory, address]);

  const handleVoteOnProposal = useCallback(
    async (proposalId: string, support: boolean) => {
      try {
        setIsTransacting(true);
        await initializeStakingService();

        const tx = await stakingService.voteOnProposal(proposalId, support);
        setPendingTx(tx);

        // Performance: Invalidate governance cache
        performanceCache.invalidatePattern(`governance:${address}`);

        Alert.alert(
          "Vote Submitted!",
          `Your ${
            support ? "FOR" : "AGAINST"
          } vote has been submitted.\n\nTransaction Hash: ${tx.hash}`,
          [{ text: "OK" }],
        );

        // Reload proposals after a delay
        setTimeout(() => {
          loadGovernanceData();
        }, 3000);
      } catch (error: any) {
        console.error("Vote error:", error);
        Alert.alert("Vote Failed", error.message || "Failed to submit vote");
      } finally {
        setIsTransacting(false);
      }
    },
    [address],
  );

  // Handle Apply as Financier
  const handleApplyAsFinancier = useCallback(async () => {
    try {
      setIsApplyingFinancier(true);

      // Check if user has sufficient stake
      if (!stakeInfo || !stakeInfo.active) {
        Alert.alert(
          "No Active Stake",
          "You need to stake USDC first before applying as a financier.",
          [{ text: "OK" }],
        );
        return;
      }

      const minFinancierStake = parseFloat(
        stakingConfig?.minimumFinancierStake || "0",
      );
      const currentStake = parseFloat(stakeInfo.amount);

      if (currentStake < minFinancierStake) {
        Alert.alert(
          "Insufficient Stake",
          `You need at least ${minFinancierStake} USDC staked to become a financier.\n\nCurrent stake: ${currentStake} USDC`,
          [{ text: "OK" }],
        );
        return;
      }

      // Confirm application
      Alert.alert(
        "Apply as Financier",
        `You are about to apply as a financier. This will grant you permission to:\n\n• Create proposals\n• Vote on proposals\n• Participate in pool guarantee decisions\n\nProceed with application?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Apply",
            onPress: async () => {
              try {
                await initializeStakingService();
                const tx = await stakingService.applyAsFinancier();

                console.log("Applying as financier, tx:", tx.hash);
                setPendingTx(tx);
                setIsTransacting(true);

                // Performance: Invalidate cache
                performanceCache.invalidatePattern(`staking:${address}`);

                Alert.alert(
                  "Application Submitted!",
                  `Your financier application has been submitted.\n\nTransaction Hash: ${tx.hash}\n\nYou will be able to create proposals, vote, and participate in pool guarantees once confirmed.`,
                  [{ text: "OK" }],
                );

                // Reload stake info after a delay
                setTimeout(() => {
                  loadStakingData();
                }, 3000);
              } catch (error: any) {
                console.error("Apply as financier error:", error);
                Alert.alert(
                  "Application Failed",
                  error.message || "Failed to apply as financier",
                );
              } finally {
                setIsApplyingFinancier(false);
              }
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("Apply as financier error:", error);
      Alert.alert("Error", error.message || "Failed to apply as financier");
      setIsApplyingFinancier(false);
    }
  }, [stakeInfo, stakingConfig, address]);

  // Helper function to calculate time left
  const getTimeLeft = useCallback((deadline: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = deadline - now;

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }, []);

  // Performance: Memoize expensive computations
  const stakedAmount = useMemo(
    () => parseFloat(stakeInfo?.amount || "0"),
    [stakeInfo?.amount],
  );

  const hasActiveStake = useMemo(
    () => stakeInfo?.active && stakedAmount > 0,
    [stakeInfo?.active, stakedAmount],
  );

  const pendingRewardsAmount = useMemo(() => {
    // Calculate total pending rewards across all tokens
    if (!multiTokenStakes?.pendingRewards) return 0;
    return multiTokenStakes.pendingRewards.reduce((total, reward) => {
      return total + parseFloat(reward || "0");
    }, 0);
  }, [multiTokenStakes?.pendingRewards]);

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Treasury Portal</Text>
            <Text style={styles.subtitle}>
              Stake, vote, and earn from treasury operations
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={async () => {
              console.log("[Refresh] Manual refresh triggered");
              setIsLoading(true);
              await loadMultiTokenData();
              await loadStakingData();
              setIsLoading(false);
            }}
            disabled={isLoading}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={24}
              color={isLoading ? colors.textSecondary : colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Network & Token Selection Card */}
        <View style={styles.selectionCard}>
          <Text style={styles.selectionLabel}>Network & Token</Text>

          {/* Network Selector */}
          <Pressable
            style={styles.selectorButton}
            onPress={() => setShowNetworkSelector(true)}
          >
            <View style={styles.selectorLeft}>
              <View
                style={[
                  styles.networkIcon,
                  {
                    backgroundColor:
                      selectedNetwork.chainId === 4202
                        ? "#0066FF"
                        : selectedNetwork.chainId === 84532
                          ? "#0052FF"
                          : "#627EEA",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="ethereum"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <View>
                <Text style={styles.selectorTitle}>{selectedNetwork.name}</Text>
                <Text style={styles.selectorSubtitle}>
                  Chain ID: {selectedNetwork.chainId}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>

          {/* Token Selector */}
          <Pressable
            style={styles.selectorButton}
            onPress={() => setShowTokenSelector(true)}
          >
            <View style={styles.selectorLeft}>
              <View
                style={[
                  styles.tokenIcon,
                  {
                    backgroundColor: selectedToken
                      ? selectedToken.symbol === "USDC"
                        ? "#2775CA"
                        : "#50AF95"
                      : colors.textSecondary,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="currency-usd"
                  size={20}
                  color="#FFFFFF"
                />
              </View>
              <View>
                <Text style={styles.selectorTitle}>
                  {selectedToken ? selectedToken.symbol : "Select Token"}
                </Text>
                <Text style={styles.selectorSubtitle}>
                  {selectedToken ? selectedToken.name : "Choose token to stake"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "stake" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("stake")}
          >
            <MaterialCommunityIcons
              name="bank"
              size={20}
              color={activeTab === "stake" ? "white" : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "stake" && styles.tabTextActive,
              ]}
            >
              Stake
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "create" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("create")}
          >
            <MaterialCommunityIcons
              name="plus-circle"
              size={20}
              color={activeTab === "create" ? "white" : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "create" && styles.tabTextActive,
              ]}
            >
              Create
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "vote" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("vote")}
          >
            <MaterialCommunityIcons
              name="vote"
              size={20}
              color={activeTab === "vote" ? "white" : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "vote" && styles.tabTextActive,
              ]}
            >
              Vote
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "pool" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("pool")}
          >
            <MaterialCommunityIcons
              name="shield-check"
              size={20}
              color={activeTab === "pool" ? "white" : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "pool" && styles.tabTextActive,
              ]}
            >
              Pool
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on active tab */}
        {activeTab === "stake" && (
          <>
            {/* Staking Overview */}
            <View style={styles.stakingCard}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons
                  name="bank"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.cardTitle}>Your Treasury Position</Text>
                {(isLoading || isTransacting) && (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ marginLeft: spacing.sm }}
                  />
                )}
              </View>

              {!isUnlocked ? (
                <View style={styles.walletPrompt}>
                  <MaterialCommunityIcons
                    name="wallet"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.walletPromptText}>
                    Connect your wallet to view staking information
                  </Text>
                </View>
              ) : (
                <>
                  {/* Show skeleton loaders while loading */}
                  {isLoading ? (
                    <>
                      <SkeletonStatsGrid />
                      <View style={{ marginTop: spacing.lg }}>
                        <Skeleton
                          width="40%"
                          height={16}
                          style={{ marginBottom: spacing.md }}
                        />
                        <Skeleton
                          width="100%"
                          height={48}
                          style={{ marginBottom: spacing.md }}
                        />
                        <Skeleton width="100%" height={48} />
                      </View>
                    </>
                  ) : (
                    <>
                      {/* Hero Card - Total Staked Across All Networks */}
                      <View style={styles.heroCard}>
                        <View style={styles.heroHeader}>
                          <MaterialCommunityIcons
                            name="cash-multiple"
                            size={28}
                            color={colors.primary}
                          />
                          <Text style={styles.heroTitle}>Portfolio Value</Text>
                        </View>
                        <Text style={styles.heroAmount}>
                          $
                          {(userTotalStakedUSD || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                        <Text style={styles.heroSubtext}>
                          Total Staked Value
                        </Text>
                      </View>

                      {/* Quick Stats Grid */}
                      <View style={styles.quickStatsGrid}>
                        <View style={styles.quickStatCard}>
                          <MaterialCommunityIcons
                            name="vote"
                            size={24}
                            color={colors.primary}
                          />
                          <Text style={styles.quickStatValue}>
                            {stakeInfo?.votingPower
                              ? (
                                  parseFloat(stakeInfo.votingPower) * 100
                                ).toFixed(2)
                              : "0.00"}
                            %
                          </Text>
                          <Text style={styles.quickStatLabel}>
                            Voting Power
                          </Text>
                        </View>

                        <View style={styles.quickStatCard}>
                          <MaterialCommunityIcons
                            name="earth"
                            size={24}
                            color={colors.success}
                          />
                          <Text style={styles.quickStatValue}>
                            $
                            {(globalPoolTotalUSD || 0).toLocaleString("en-US", {
                              maximumFractionDigits: 0,
                            })}
                          </Text>
                          <Text style={styles.quickStatLabel}>Global Pool</Text>
                        </View>

                        <View style={styles.quickStatCard}>
                          <MaterialCommunityIcons
                            name="chart-line"
                            size={24}
                            color={colors.warning}
                          />
                          <Text style={styles.quickStatValue}>
                            {(currentAPR || 0).toFixed(1)}%
                          </Text>
                          <Text style={styles.quickStatLabel}>Current APR</Text>
                        </View>
                      </View>

                      {/* Token Selector */}
                      <View style={styles.stakeInputSection}>
                        <Text style={styles.inputLabel}>Select Token</Text>
                        <TouchableOpacity
                          style={styles.tokenSelectorButton}
                          onPress={() =>
                            setShowTokenSelector(!showTokenSelector)
                          }
                          disabled={isTransacting}
                        >
                          <View style={styles.selectedTokenInfo}>
                            <Text style={styles.tokenSymbol}>
                              {selectedToken?.symbol || "Select Token"}
                            </Text>
                            <Text style={styles.tokenBalance}>
                              Balance:{" "}
                              {selectedToken
                                ? tokenBalances[selectedToken.address] || "0"
                                : "0"}
                            </Text>
                          </View>
                          <MaterialCommunityIcons
                            name={
                              showTokenSelector ? "chevron-up" : "chevron-down"
                            }
                            size={24}
                            color={colors.primary}
                          />
                        </TouchableOpacity>

                        {/* Token Dropdown */}
                        {showTokenSelector && (
                          <View style={styles.tokenDropdown}>
                            {supportedTokens.map((token) => (
                              <TouchableOpacity
                                key={token.address}
                                style={[
                                  styles.tokenOption,
                                  selectedToken?.address === token.address &&
                                    styles.tokenOptionSelected,
                                ]}
                                onPress={() => {
                                  setSelectedToken(token);
                                  setShowTokenSelector(false);
                                }}
                              >
                                <View style={styles.tokenOptionInfo}>
                                  <Text style={styles.tokenOptionSymbol}>
                                    {token.symbol}
                                  </Text>
                                  <Text style={styles.tokenOptionName}>
                                    {token.name}
                                  </Text>
                                </View>
                                <View style={styles.tokenOptionBalance}>
                                  <Text style={styles.tokenOptionBalanceText}>
                                    {tokenBalances[token.address] || "0"}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Stake Input Section */}
                      <View style={styles.stakeInputSection}>
                        <Text style={styles.inputLabel}>
                          Stake Amount ({selectedToken?.symbol || "USDC"})
                        </Text>
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={[
                              styles.amountInput,
                              isTransacting && styles.inputDisabled,
                            ]}
                            value={stakeAmount}
                            onChangeText={setStakeAmount}
                            placeholder="Enter amount to stake"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="decimal-pad"
                            editable={!isTransacting}
                          />
                          <TouchableOpacity
                            style={[
                              styles.maxButton,
                              isTransacting && styles.maxButtonDisabled,
                            ]}
                            onPress={() => {
                              const balance = selectedToken
                                ? tokenBalances[selectedToken.address] || "0"
                                : usdcBalance;
                              const maxStake = Math.max(
                                0,
                                parseFloat(balance) - 0.01,
                              );
                              setStakeAmount(maxStake.toFixed(6));
                            }}
                            disabled={isTransacting}
                          >
                            <Text style={styles.maxButtonText}>MAX</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Stake as Financier Option */}
                        <TouchableOpacity
                          style={styles.financierCheckbox}
                          onPress={() => setStakeAsFinancier(!stakeAsFinancier)}
                          disabled={isTransacting}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              stakeAsFinancier && styles.checkboxChecked,
                            ]}
                          >
                            {stakeAsFinancier && (
                              <MaterialCommunityIcons
                                name="check"
                                size={16}
                                color="white"
                              />
                            )}
                          </View>
                          <View style={styles.checkboxLabel}>
                            <Text style={styles.checkboxText}>
                              Stake as Financier
                            </Text>
                            <Text style={styles.checkboxSubtext}>
                              Grant voting rights and governance access (minimum{" "}
                              {stakingConfig?.minimumFinancierStake || "0"}{" "}
                              USDC)
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {stakingConfig &&
                          stakeAmount &&
                          parseFloat(stakeAmount) > 0 && (
                            <Text style={styles.stakingInfo}>
                              Min stake:{" "}
                              {stakeAsFinancier
                                ? stakingConfig.minimumFinancierStake
                                : stakingConfig.minimumStake}{" "}
                              USDC • Lock period:{" "}
                              {Math.floor(
                                (stakeAsFinancier
                                  ? stakingConfig.minFinancierLockDuration
                                  : stakingConfig.minNormalStakerLockDuration) /
                                  86400,
                              )}{" "}
                              days
                            </Text>
                          )}
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[
                            styles.stakeButtonFull,
                            (isTransacting ||
                              !stakeAmount ||
                              parseFloat(stakeAmount) <= 0) &&
                              styles.buttonDisabled,
                          ]}
                          onPress={handleStakeUSDC}
                          disabled={
                            isTransacting ||
                            !stakeAmount ||
                            parseFloat(stakeAmount) <= 0
                          }
                        >
                          {isTransacting ? (
                            <>
                              <ActivityIndicator size="small" color="white" />
                              <Text style={styles.stakeButtonText}>
                                {stakingProgress || "Processing..."}
                              </Text>
                            </>
                          ) : (
                            <>
                              <MaterialCommunityIcons
                                name="plus-circle"
                                size={20}
                                color="white"
                              />
                              <Text style={styles.stakeButtonText}>
                                Stake{" "}
                                {stakeAsFinancier ? "as Financier" : "USDC"}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Unstake Section */}
                      {stakeInfo?.active && (
                        <View style={styles.unstakeSection}>
                          <Text style={styles.inputLabel}>
                            Unstake Amount (USDC)
                          </Text>
                          <View style={styles.inputContainer}>
                            <TextInput
                              style={[
                                styles.amountInput,
                                isTransacting && styles.inputDisabled,
                              ]}
                              value={unstakeAmount}
                              onChangeText={setUnstakeAmount}
                              placeholder="Enter amount to unstake"
                              placeholderTextColor={colors.textSecondary}
                              keyboardType="decimal-pad"
                              editable={!isTransacting}
                            />
                            <TouchableOpacity
                              style={[
                                styles.maxButton,
                                isTransacting && styles.maxButtonDisabled,
                              ]}
                              onPress={() => setUnstakeAmount(stakeInfo.amount)}
                              disabled={isTransacting}
                            >
                              <Text style={styles.maxButtonText}>MAX</Text>
                            </TouchableOpacity>
                          </View>

                          {stakeInfo.timeUntilUnlock &&
                            stakeInfo.timeUntilUnlock > 0 && (
                              <Text style={styles.lockWarning}>
                                ⚠️ Locked for{" "}
                                {Math.ceil(stakeInfo.timeUntilUnlock / 86400)}{" "}
                                more days
                              </Text>
                            )}

                          <View style={styles.unstakeButtons}>
                            <TouchableOpacity
                              style={[
                                styles.unstakeButton,
                                isTransacting ||
                                !unstakeAmount ||
                                parseFloat(unstakeAmount) <= 0 ||
                                Boolean(
                                  stakeInfo?.timeUntilUnlock &&
                                  stakeInfo.timeUntilUnlock > 0,
                                )
                                  ? styles.buttonDisabled
                                  : null,
                              ]}
                              onPress={handleUnstake}
                              disabled={
                                isTransacting ||
                                !unstakeAmount ||
                                parseFloat(unstakeAmount) <= 0 ||
                                Boolean(
                                  stakeInfo?.timeUntilUnlock &&
                                  stakeInfo.timeUntilUnlock > 0,
                                )
                              }
                            >
                              {isTransacting &&
                              pendingTx?.type === "unstake" ? (
                                <ActivityIndicator
                                  size="small"
                                  color={colors.warning}
                                />
                              ) : (
                                <MaterialCommunityIcons
                                  name="minus-circle"
                                  size={20}
                                  color={
                                    stakeInfo?.timeUntilUnlock &&
                                    stakeInfo.timeUntilUnlock > 0
                                      ? colors.textSecondary
                                      : colors.warning
                                  }
                                />
                              )}
                              <Text
                                style={[
                                  styles.unstakeButtonText,
                                  Boolean(
                                    stakeInfo?.timeUntilUnlock &&
                                    stakeInfo.timeUntilUnlock > 0,
                                  )
                                    ? styles.buttonTextDisabled
                                    : null,
                                ]}
                              >
                                {isTransacting && pendingTx?.type === "unstake"
                                  ? "Unstaking..."
                                  : stakeInfo?.timeUntilUnlock &&
                                      stakeInfo.timeUntilUnlock > 0
                                    ? "Locked"
                                    : "Unstake"}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.emergencyButton,
                                (isTransacting ||
                                  !stakeInfo?.active ||
                                  parseFloat(stakeInfo?.amount || "0") <= 0) &&
                                  styles.buttonDisabled,
                              ]}
                              onPress={handleEmergencyWithdraw}
                              disabled={
                                isTransacting ||
                                !stakeInfo?.active ||
                                parseFloat(stakeInfo?.amount || "0") <= 0
                              }
                            >
                              {isTransacting &&
                              pendingTx?.type === "emergency" ? (
                                <ActivityIndicator
                                  size="small"
                                  color={colors.error}
                                />
                              ) : (
                                <MaterialCommunityIcons
                                  name="alert-circle"
                                  size={20}
                                  color={
                                    !stakeInfo?.active ||
                                    parseFloat(stakeInfo?.amount || "0") <= 0
                                      ? colors.textSecondary
                                      : colors.error
                                  }
                                />
                              )}
                              <Text
                                style={[
                                  styles.emergencyButtonText,
                                  (!stakeInfo?.active ||
                                    parseFloat(stakeInfo?.amount || "0") <=
                                      0) &&
                                    styles.buttonTextDisabled,
                                ]}
                              >
                                {isTransacting &&
                                pendingTx?.type === "emergency"
                                  ? "Processing..."
                                  : "Emergency"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Financier Revocation Panel */}
                      {isFinancier && (
                        <FinancierRevocationPanel
                          userAddress={address || ""}
                          isFinancier={isFinancier}
                          onRevocationComplete={() => {
                            // Refresh financier status after revocation
                            loadStakingData();
                          }}
                        />
                      )}

                      {/* Custom Deadline Management */}
                      {isFinancier && (
                        <View style={styles.customDeadlineSection}>
                          <TouchableOpacity
                            style={styles.customDeadlineButton}
                            onPress={() => setShowCustomDeadlineModal(true)}
                          >
                            <MaterialCommunityIcons
                              name="calendar-clock"
                              size={20}
                              color={colors.primary}
                            />
                            <Text style={styles.customDeadlineButtonText}>
                              Set Custom Lock Period
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {activeTab === "create" && (
          <>
            {/* Financier Check for Create Proposal */}
            {!isFinancier ? (
              <View style={styles.section}>
                <View style={styles.financierPrompt}>
                  <MaterialCommunityIcons
                    name="account-star"
                    size={64}
                    color={colors.primary}
                  />
                  <Text style={styles.financierPromptTitle}>
                    Become a Financier to Create Proposals
                  </Text>
                  <Text style={styles.financierPromptText}>
                    To create proposals, you need to be an eligible financier.
                    Financiers have voting rights and can participate in
                    treasury governance.
                  </Text>
                  <View style={styles.financierRequirements}>
                    <Text style={styles.requirementsTitle}>Requirements:</Text>
                    <Text style={styles.requirementsItem}>
                      • Minimum stake:{" "}
                      {stakingConfig?.minimumFinancierStake || "0"} USDC
                    </Text>
                    <Text style={styles.requirementsItem}>
                      • Your current stake:{" "}
                      {stakeInfo?.amount
                        ? parseFloat(stakeInfo.amount).toFixed(2)
                        : "0.00"}{" "}
                      USDC
                    </Text>
                    <Text style={styles.requirementsItem}>
                      • Status: {stakeInfo?.active ? "✓ Active" : "✗ Inactive"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.applyFinancierButton,
                      (!stakeInfo?.active ||
                        parseFloat(stakeInfo?.amount || "0") <
                          parseFloat(
                            stakingConfig?.minimumFinancierStake || "0",
                          )) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleApplyAsFinancier}
                    disabled={
                      isApplyingFinancier ||
                      !stakeInfo?.active ||
                      parseFloat(stakeInfo?.amount || "0") <
                        parseFloat(stakingConfig?.minimumFinancierStake || "0")
                    }
                  >
                    {isApplyingFinancier ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="account-check"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.applyFinancierButtonText}>
                          Apply as Financier
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Create Proposal Section */
              <View style={styles.createProposalCard}>
                <View style={styles.cardHeader}>
                  <MaterialCommunityIcons
                    name="plus-circle"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={styles.cardTitle}>Create New Proposal</Text>
                </View>

                <Text style={styles.createDescription}>
                  Submit a proposal for the treasury community to vote on. Your
                  proposal will be reviewed and then opened for voting.
                </Text>

                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>Proposal Category</Text>
                  <View style={styles.categoryContainer}>
                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        proposalCategory === "Treasury" &&
                          styles.categoryButtonActive,
                      ]}
                      onPress={() => setProposalCategory("Treasury")}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          proposalCategory === "Treasury" &&
                            styles.categoryTextActive,
                        ]}
                      >
                        Treasury
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        proposalCategory === "Investment" &&
                          styles.categoryButtonActive,
                      ]}
                      onPress={() => setProposalCategory("Investment")}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          proposalCategory === "Investment" &&
                            styles.categoryTextActive,
                        ]}
                      >
                        Investment
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        proposalCategory === "Guarantee" &&
                          styles.categoryButtonActive,
                      ]}
                      onPress={() => setProposalCategory("Guarantee")}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          proposalCategory === "Guarantee" &&
                            styles.categoryTextActive,
                        ]}
                      >
                        Guarantee
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>Proposal Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={proposalTitle}
                    onChangeText={setProposalTitle}
                    placeholder="Enter a clear, concise title for your proposal"
                    placeholderTextColor={colors.textSecondary}
                    multiline={false}
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>Proposal Description *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    value={proposalDescription}
                    onChangeText={setProposalDescription}
                    placeholder="Provide detailed information about your proposal, including objectives, implementation plan, and expected outcomes..."
                    placeholderTextColor={colors.textSecondary}
                    multiline={true}
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.proposalRequirements}>
                  <MaterialCommunityIcons
                    name="information"
                    size={20}
                    color={colors.primary}
                  />
                  <View style={styles.requirementsText}>
                    <Text style={styles.requirementsTitle}>Requirements:</Text>
                    <Text style={styles.requirementsItem}>
                      • Must be an eligible financier to propose
                    </Text>
                    <Text style={styles.requirementsItem}>
                      • Current stake:{" "}
                      {stakeInfo?.amount
                        ? parseFloat(stakeInfo.amount).toFixed(2)
                        : "0.00"}{" "}
                      USDC
                    </Text>
                    <Text style={styles.requirementsItem}>
                      • Proposal will be reviewed within 24 hours
                    </Text>
                    <Text style={styles.requirementsItem}>
                      • Voting period lasts 7 days once approved
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitProposalButton,
                    (!proposalTitle.trim() || !proposalDescription.trim()) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={handleCreateProposal}
                  disabled={
                    !proposalTitle.trim() || !proposalDescription.trim()
                  }
                >
                  <MaterialCommunityIcons
                    name="send"
                    size={20}
                    color={
                      !proposalTitle.trim() || !proposalDescription.trim()
                        ? colors.textSecondary
                        : "white"
                    }
                  />
                  <Text
                    style={[
                      styles.submitProposalButtonText,
                      (!proposalTitle.trim() || !proposalDescription.trim()) &&
                        styles.buttonTextDisabled,
                    ]}
                  >
                    Submit Proposal
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {activeTab === "vote" && (
          <>
            {/* Financier Check for Voting */}
            {!isFinancier ? (
              <View style={styles.section}>
                <View style={styles.financierPrompt}>
                  <MaterialCommunityIcons
                    name="vote-outline"
                    size={64}
                    color={colors.primary}
                  />
                  <Text style={styles.financierPromptTitle}>
                    Become a Financier to Vote
                  </Text>
                  <Text style={styles.financierPromptText}>
                    Voting on proposals requires financier status. Apply as a
                    financier to participate in treasury governance.
                  </Text>
                  <View style={styles.financierRequirements}>
                    <Text style={styles.requirementsTitle}>Requirements:</Text>
                    <Text style={styles.requirementsItem}>
                      • Minimum stake:{" "}
                      {stakingConfig?.minimumFinancierStake || "0"} USDC
                    </Text>
                    <Text style={styles.requirementsItem}>
                      • Your current stake:{" "}
                      {stakeInfo?.amount
                        ? parseFloat(stakeInfo.amount).toFixed(2)
                        : "0.00"}{" "}
                      USDC
                    </Text>
                    <Text style={styles.requirementsItem}>
                      • Status: {stakeInfo?.active ? "✓ Active" : "✗ Inactive"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.applyFinancierButton,
                      (!stakeInfo?.active ||
                        parseFloat(stakeInfo?.amount || "0") <
                          parseFloat(
                            stakingConfig?.minimumFinancierStake || "0",
                          )) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleApplyAsFinancier}
                    disabled={
                      isApplyingFinancier ||
                      !stakeInfo?.active ||
                      parseFloat(stakeInfo?.amount || "0") <
                        parseFloat(stakingConfig?.minimumFinancierStake || "0")
                    }
                  >
                    {isApplyingFinancier ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="account-check"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.applyFinancierButtonText}>
                          Apply as Financier
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Treasury Voting */
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Treasury Voting</Text>
                  <TouchableOpacity
                    onPress={loadGovernanceData}
                    disabled={isLoadingProposals}
                  >
                    <MaterialCommunityIcons
                      name="refresh"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>

                {isLoadingProposals ? (
                  <SkeletonList count={3} />
                ) : proposals.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                      name="vote-outline"
                      size={64}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.emptyStateTitle}>No Proposals Yet</Text>
                    <Text style={styles.emptyStateText}>
                      Be the first to create a proposal! Switch to the "create"
                      tab to get started.
                    </Text>
                  </View>
                ) : (
                  proposals.map((proposal) => {
                    const totalVotes =
                      parseFloat(proposal.votesFor) +
                      parseFloat(proposal.votesAgainst);
                    const forPercentage =
                      totalVotes > 0
                        ? (parseFloat(proposal.votesFor) / totalVotes) * 100
                        : 0;
                    const isActive =
                      proposal.votingDeadline > Math.floor(Date.now() / 1000) &&
                      !proposal.executed;
                    const status = proposal.executed
                      ? "Executed"
                      : isActive
                        ? "Active"
                        : "Ended";

                    return (
                      <View key={proposal.id} style={styles.proposalCard}>
                        <View style={styles.proposalHeader}>
                          <View style={styles.proposalBadge}>
                            <Text style={styles.proposalCategory}>
                              {proposal.category}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              isActive
                                ? styles.statusBadgeActive
                                : styles.statusBadgePassed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                isActive
                                  ? styles.statusTextActive
                                  : styles.statusTextPassed,
                              ]}
                            >
                              {status}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.proposalTitle}>
                          {proposal.title}
                        </Text>
                        <Text
                          style={styles.proposalDescription}
                          numberOfLines={3}
                        >
                          {proposal.description}
                        </Text>

                        <View style={styles.votingStats}>
                          <View style={styles.voteBar}>
                            <View style={styles.voteBarTrack}>
                              <View
                                style={[
                                  styles.voteBarFill,
                                  { width: `${forPercentage}%` },
                                ]}
                              />
                            </View>
                            <View style={styles.voteNumbers}>
                              <Text style={styles.votesFor}>
                                For: {proposal.votesFor}
                              </Text>
                              <Text style={styles.votesAgainst}>
                                Against: {proposal.votesAgainst}
                              </Text>
                            </View>
                          </View>

                          {isActive && (
                            <>
                              <Text style={styles.timeLeft}>
                                {getTimeLeft(proposal.votingDeadline)} left to
                                vote
                              </Text>
                              <View style={styles.voteActions}>
                                <TouchableOpacity
                                  style={styles.voteButton}
                                  onPress={() =>
                                    handleVoteOnProposal(proposal.id, true)
                                  }
                                  disabled={isTransacting}
                                >
                                  <Text style={styles.voteButtonText}>
                                    Vote For
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.voteButton,
                                    styles.voteButtonAgainst,
                                  ]}
                                  onPress={() =>
                                    handleVoteOnProposal(proposal.id, false)
                                  }
                                  disabled={isTransacting}
                                >
                                  <Text style={styles.voteButtonTextAgainst}>
                                    Vote Against
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}

        {activeTab === "pool" && (
          <>
            {/* Financier Check for Pool Guarantee */}
            {!isFinancier ? (
              <View style={styles.section}>
                <View style={styles.financierPrompt}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={64}
                    color={colors.primary}
                  />
                  <Text style={styles.financierPromptTitle}>
                    Become a Financier for Pool Guarantee
                  </Text>
                  <Text style={styles.financierPromptText}>
                    Participating in pool guarantee decisions requires financier
                    status. Apply as a financier to review and approve pool
                    guarantee applications.
                  </Text>
                  <View style={styles.financierRequirements}>
                    <Text style={styles.requirementsTitle}>Requirements:</Text>
                    <Text style={styles.requirementsItem}>
                      • Minimum stake:{" "}
                      {stakingConfig?.minimumFinancierStake || "0"} USDC
                    </Text>
                    <Text style={styles.requirementsItem}>
                      • Your current stake:{" "}
                      {stakeInfo?.amount
                        ? parseFloat(stakeInfo.amount).toFixed(2)
                        : "0.00"}{" "}
                      USDC
                    </Text>
                    <Text style={styles.requirementsItem}>
                      • Status: {stakeInfo?.active ? "✓ Active" : "✗ Inactive"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.applyFinancierButton,
                      (!stakeInfo?.active ||
                        parseFloat(stakeInfo?.amount || "0") <
                          parseFloat(
                            stakingConfig?.minimumFinancierStake || "0",
                          )) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleApplyAsFinancier}
                    disabled={
                      isApplyingFinancier ||
                      !stakeInfo?.active ||
                      parseFloat(stakeInfo?.amount || "0") <
                        parseFloat(stakingConfig?.minimumFinancierStake || "0")
                    }
                  >
                    {isApplyingFinancier ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="account-check"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.applyFinancierButtonText}>
                          Apply as Financier
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Pool Guarantee Applications for Review */
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Pool Guarantee Applications
                </Text>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                  <MaterialCommunityIcons
                    name="magnify"
                    size={20}
                    color={colors.textSecondary}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by ID, buyer, seller, or description..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Filter Tabs - Mobile Optimized */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterTabsContainer}
                >
                  <View style={styles.filterTabs}>
                    <TouchableOpacity
                      style={[styles.filterTab, styles.filterTabActive]}
                    >
                      <Text
                        style={[
                          styles.filterTabText,
                          styles.filterTabTextActive,
                        ]}
                      >
                        Pending (5)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterTab}>
                      <Text style={styles.filterTabText}>Approved (0)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterTab}>
                      <Text style={styles.filterTabText}>Issuance (1)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterTab}>
                      <Text style={styles.filterTabText}>Issued (5)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterTab}>
                      <Text style={styles.filterTabText}>Rejected (0)</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>

                {/* Application Card */}
                <View style={styles.applicationReviewCard}>
                  <View style={styles.applicationReviewHeader}>
                    <View style={styles.applicationTitleRow}>
                      <MaterialCommunityIcons
                        name="file-document"
                        size={20}
                        color={colors.primary}
                      />
                      <View style={styles.applicationIdContainer}>
                        <Text style={styles.applicationId}>
                          PG-1763321117688-OWSX869
                        </Text>
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>
                            PENDING VOTE
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.applicationDate}>
                      Applied on Nov 16, 2025
                    </Text>
                  </View>

                  <View style={styles.applicationInfo}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Buyer (Applicant)</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        0x759ed3d2...fe5e5582a
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Seller (Beneficiary)</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        0x324ffda4...b9f141
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Goods Description</Text>
                      <Text style={styles.infoValue}>
                        Import of Cloth from Ghana
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Guarantee Amount</Text>
                      <Text style={styles.infoValue}>$4.00</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Collateral Posted</Text>
                      <Text style={styles.infoValue}>$0.40</Text>
                    </View>
                  </View>

                  <View style={styles.votingSection}>
                    <View style={styles.votingHeader}>
                      <Text style={styles.votingTitle}>Current Votes</Text>
                    </View>
                    <Text style={styles.approvalThreshold}>
                      60% approval threshold required
                    </Text>

                    <View style={styles.voteProgressBar}>
                      <View style={styles.voteProgress}>
                        <View
                          style={[styles.voteProgressFill, { width: "0%" }]}
                        />
                      </View>
                      <Text style={styles.voteProgressText}>
                        For: 0 Against: 0
                      </Text>
                    </View>

                    <View style={styles.voteActions}>
                      <TouchableOpacity style={styles.approveVoteButton}>
                        <MaterialCommunityIcons
                          name="thumb-up"
                          size={16}
                          color="white"
                        />
                        <Text style={styles.voteButtonText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.rejectVoteButton}>
                        <MaterialCommunityIcons
                          name="thumb-down"
                          size={16}
                          color="white"
                        />
                        <Text style={styles.voteButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.applicationActions}>
                    <TouchableOpacity style={styles.viewDocumentsButton}>
                      <MaterialCommunityIcons
                        name="file-multiple"
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.viewDocumentsText}>Documents</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.viewDraftButton}>
                      <MaterialCommunityIcons
                        name="eye"
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.viewDraftText}>View Draft</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Certificate Issuance Card */}
                <View style={styles.certificateIssuanceCard}>
                  <View style={styles.applicationReviewHeader}>
                    <View style={styles.applicationTitleRow}>
                      <MaterialCommunityIcons
                        name="certificate"
                        size={20}
                        color={colors.success}
                      />
                      <View style={styles.applicationIdContainer}>
                        <Text style={styles.applicationId}>
                          PG-1763321117688-OWSX869
                        </Text>
                        <View style={styles.issuanceBadge}>
                          <Text style={styles.issuanceBadgeText}>
                            READY FOR ISSUANCE
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.applicationDate}>
                      Invoice Settled on Nov 16, 2025
                    </Text>
                  </View>

                  <View style={styles.applicationInfo}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Buyer (Applicant)</Text>
                      <Text style={styles.infoValue}>BILAL LTD</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Trade Description</Text>
                      <Text style={styles.infoValue}>
                        Import of Cloth from Ghana
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Guarantee Amount</Text>
                      <Text style={styles.infoValue}>4.00 USDC</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Invoice Settlement</Text>
                      <Text
                        style={[styles.infoValue, { color: colors.success }]}
                      >
                        ✓ Paid in Full
                      </Text>
                    </View>
                  </View>

                  <View style={styles.issuanceSection}>
                    <View style={styles.issuanceHeader}>
                      <MaterialCommunityIcons
                        name="information"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.issuanceTitle}>
                        Ready for Certificate Issuance
                      </Text>
                    </View>

                    <Text style={styles.issuanceDescription}>
                      All requirements met. Invoice has been settled. Treasury
                      delegates can now issue the pool guarantee certificate.
                    </Text>

                    <View style={styles.certificateActions}>
                      <TouchableOpacity style={styles.issueCertificateButton}>
                        <MaterialCommunityIcons
                          name="certificate"
                          size={16}
                          color="white"
                        />
                        <Text style={styles.issueCertificateButtonText}>
                          Issue Certificate
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.viewDetailsButton}>
                        <MaterialCommunityIcons
                          name="eye"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.viewDetailsButtonText}>
                          View Details
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Network Selector Modal */}
      <NetworkSelector
        visible={showNetworkSelector}
        onClose={() => setShowNetworkSelector(false)}
        onSelectNetwork={handleNetworkSelect}
        selectedNetworkId={currentNetworkId}
      />

      {/* Token Selector Modal */}
      <TokenSelector
        visible={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelectToken={handleTokenSelect}
        selectedToken={
          selectedToken
            ? {
                address: selectedToken.address,
                symbol: selectedToken.symbol,
                name: selectedToken.name,
                decimals: selectedToken.decimals,
                balance: tokenBalances[selectedToken.address] || "0",
              }
            : undefined
        }
        networkId={currentNetworkId}
        showBalances={true}
      />

      {/* Custom Deadline Modal */}
      <CustomDeadlineModal
        visible={showCustomDeadlineModal}
        currentDeadline={customDeadlineDays}
        isFinancier={isFinancier}
        onClose={() => setShowCustomDeadlineModal(false)}
        onSuccess={() => {
          setShowCustomDeadlineModal(false);
          // Refresh staking data to reflect new deadline
          loadStakingData();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // ... (all existing styles remain the same)
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  refreshButton: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Network & Token Selection Styles
  selectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border || "#E0E0E0",
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  selectorSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  tabTextActive: {
    color: "white",
  },

  stakingCard: {
    margin: spacing.lg,
    marginTop: 0,
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.md,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  poolInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  poolStat: {
    alignItems: "center",
  },
  poolLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  poolValue: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  poolValuePositive: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.success,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stakeButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stakeButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  unstakeButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  unstakeButtonText: {
    color: colors.warning,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  buttonDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
  emergencyButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyButtonText: {
    color: colors.error,
    fontWeight: "500",
    marginLeft: spacing.sm,
  },
  section: {
    margin: spacing.lg,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  viewAllButton: {
    padding: spacing.sm,
  },
  viewAllText: {
    color: colors.primary,
    fontWeight: "500",
  },
  proposalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  proposalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  proposalBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  proposalCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  statusBadgeActive: {
    backgroundColor: colors.warning + "20",
  },
  statusBadgePassed: {
    backgroundColor: colors.success + "20",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusTextActive: {
    color: colors.warning,
  },
  statusTextPassed: {
    color: colors.success,
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  proposalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  votingStats: {
    marginBottom: spacing.md,
  },
  voteBar: {
    marginBottom: spacing.md,
  },
  voteBarTrack: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  voteBarFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  voteNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  votesFor: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
  },
  votesAgainst: {
    fontSize: 12,
    color: colors.error,
    fontWeight: "500",
  },
  voteActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  voteButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: "center",
  },
  voteButtonAgainst: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.error,
  },
  voteButtonText: {
    color: "white",
    fontWeight: "500",
  },
  voteButtonTextAgainst: {
    color: colors.error,
  },

  // Financier Prompt Styles
  financierPrompt: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  financierPromptTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  financierPromptText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  financierRequirements: {
    backgroundColor: "white",
    padding: spacing.lg,
    borderRadius: 12,
    width: "100%",
    marginBottom: spacing.lg,
  },
  applyFinancierButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    gap: spacing.sm,
    width: "100%",
  },
  applyFinancierButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  // Financier Checkbox Styles
  financierCheckbox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  checkboxSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  timeLeft: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },

  // Create Proposal Styles
  createProposalCard: {
    margin: spacing.lg,
    marginTop: 0,
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  categoryContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: "center",
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "white",
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "white",
  },
  textAreaInput: {
    height: 120,
    textAlignVertical: "top",
  },
  proposalRequirements: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  requirementsText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  requirementsItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  submitProposalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitProposalButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  guaranteeCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  guaranteeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  guaranteeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.md,
  },
  guaranteeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
  },
  applyButtonText: {
    color: colors.primary,
    fontWeight: "500",
    marginRight: spacing.sm,
  },
  // Pool Guarantee Review Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  filterTabsContainer: {
    marginBottom: spacing.lg,
  },
  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    minWidth: 80,
  },
  filterTabActive: {
    borderBottomColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: colors.primary,
  },
  applicationReviewCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  applicationReviewHeader: {
    marginBottom: spacing.lg,
  },
  applicationTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  applicationIdContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  applicationId: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pendingBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  pendingBadgeText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
  },
  applicationDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  applicationInfo: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  votingSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  votingHeader: {
    marginBottom: spacing.sm,
  },
  votingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  approvalThreshold: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  voteProgressBar: {
    marginBottom: spacing.lg,
  },
  voteProgress: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    marginBottom: spacing.sm,
  },
  voteProgressFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  voteProgressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  applicationActions: {
    flexDirection: "row",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  viewDocumentsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    gap: spacing.xs,
  },
  viewDocumentsText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  viewDraftButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    gap: spacing.xs,
  },
  viewDraftText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  approveVoteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.success,
    borderRadius: 8,
    gap: spacing.xs,
  },
  rejectVoteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.error,
    borderRadius: 8,
    gap: spacing.xs,
  },
  // Certificate Issuance Styles
  certificateIssuanceCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success + "30",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  issuanceBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  issuanceBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  issuanceSection: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  issuanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  issuanceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.sm,
  },
  issuanceDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  certificateActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  issueCertificateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  issueCertificateButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  viewDetailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  viewDetailsButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  // Additional styles for enhanced staking interface
  statSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  walletPrompt: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  walletPromptText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  networkPrompt: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  networkPromptText: {
    fontSize: 14,
    color: colors.warning,
    textAlign: "center",
    marginTop: spacing.md,
    fontWeight: "500",
  },
  stakeInputSection: {
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "white",
  },
  maxButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    marginLeft: spacing.sm,
  },
  maxButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  stakingInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  stakeButtonFull: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  unstakeSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lockWarning: {
    fontSize: 12,
    color: colors.warning,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  unstakeButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  poolStatsRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  poolStatItem: {
    flex: 1,
    alignItems: "center",
  },
  poolStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputDisabled: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
  },
  maxButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl * 2,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl * 2,
    backgroundColor: "white",
    borderRadius: 12,
    marginVertical: spacing.md,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  // Token Selector Styles
  tokenSelectorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedTokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  tokenBalance: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tokenDropdown: {
    marginTop: spacing.sm,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tokenOptionSelected: {
    backgroundColor: colors.primary + "10",
  },
  tokenOptionInfo: {
    flex: 1,
  },
  tokenOptionSymbol: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  tokenOptionName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tokenOptionBalance: {
    alignItems: "flex-end",
  },
  tokenOptionBalanceText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  // Multi-Token Pool Breakdown Styles
  multiTokenPoolSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  poolSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  poolSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.sm,
  },
  totalPoolCard: {
    backgroundColor: colors.primary + "15",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  totalPoolLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  totalPoolValue: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
  },
  tokenBreakdownList: {
    gap: spacing.md,
  },
  tokenBreakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tokenBreakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  tokenBreakdownInfo: {
    flex: 1,
  },
  tokenBreakdownSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  tokenBreakdownName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tokenBreakdownStats: {
    alignItems: "flex-end",
  },
  tokenBreakdownAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  tokenBreakdownUSD: {
    fontSize: 14,
    color: colors.success,
    fontWeight: "500",
  },
  tokenProgressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: spacing.sm,
  },
  tokenProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  tokenPercentage: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
  },
  // Treasury Overview Styles
  treasuryOverview: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overviewMainValue: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  networkBreakdown: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  networkName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tokenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "30",
  },
  tokenRowSymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    flex: 1,
  },
  tokenAmount: {
    fontSize: 13,
    color: colors.text,
    flex: 2,
    textAlign: "center",
  },
  tokenUSD: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.success,
    flex: 1,
    textAlign: "right",
  },
  networkTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing.sm,
    textAlign: "right",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Hero Card Styles (Portfolio Value)
  heroCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: spacing.xl,
    margin: spacing.lg,
    marginTop: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.primary + "10",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -1,
    height: 54,
  },
  heroSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Network Breakdown Styles
  breakdownSection: {
    margin: spacing.lg,
    marginTop: spacing.md,
  },
  networkCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  networkCardHeader: {
    marginBottom: spacing.md,
  },
  networkTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  networkCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  networkCardTotal: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginTop: spacing.xs,
  },
  // Token Stake Row Styles
  tokenStakeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  tokenStakeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
  },
  tokenIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  tokenIconText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  tokenStakeName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  tokenStakeAmount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tokenStakeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  // Quick Stats Grid Styles
  quickStatsGrid: {
    flexDirection: "column",
    gap: spacing.md,
    margin: spacing.lg,
    marginTop: spacing.md,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Custom Deadline Section Styles
  customDeadlineSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  customDeadlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary + "15",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  customDeadlineButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
});

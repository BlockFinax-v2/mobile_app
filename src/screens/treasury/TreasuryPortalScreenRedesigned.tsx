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
  RefreshControl,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  VoteStatus,
  DIAMOND_ADDRESSES,
} from "@/services/stakingService";
import {
  getSupportedStablecoins,
  convertToUSD,
  StablecoinConfig,
} from "@/config/stablecoinPrices";
import { useTradeFinance } from "@/contexts/TradeFinanceContext";
import { SellerDraftView } from "@/components/trade/SellerDraftView";

type TreasuryPortalCache = {
  userTotalStakedUSD: number;
  userVotingPowerPercentage: number;
  globalPoolTotalUSD: number;
  currentAPR: number;
  isFinancier: boolean;
  availableBalances: Record<string, number>;
  allStakesInfo: AllStakesInfo | null;
  stakingConfig: StakingConfig | null;
  proposals: Proposal[];
  daoStats: DAOStats | null;
  daoConfig: DAOConfig | null;
  lastUpdated: number;
};

const treasuryPortalMemoryCache = new Map<string, TreasuryPortalCache>();

const { width } = Dimensions.get("window");

const POOL_READ_ABI = [
  "function getTotalStakedUSD() view returns (uint256)",
  "function getStakers() view returns (address[])",
  "function getAllStakesForUser(address staker) view returns (address[] tokens,uint256[] amounts,uint256[] usdEquivalents,bool[] isFinancierFlags,uint256[] deadlines,uint256[] pendingRewards,uint256 totalUsdValue)",
];

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
  const {
    selectedNetwork,
    isUnlocked,
    address,
    switchNetwork,
    balances,
    displayBalances,
    getNetworkById,
  } = useWallet();

  const { applications, votePGABlockchain } = useTradeFinance();

  // State management
  const [activeTab, setActiveTab] = useState<
    "stake" | "create" | "vote" | "pool"
  >("stake");
  const [actionMode, setActionMode] = useState<"stake" | "unstake" | "revoke">(
    "stake",
  );
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

  // Portfolio data (persist last good values until refreshed)
  const [userTotalStakedUSD, setUserTotalStakedUSD] = useState<number>(0);
  const [userVotingPowerPercentage, setUserVotingPowerPercentage] =
    useState<number>(0);
  const [globalPoolTotalUSD, setGlobalPoolTotalUSD] = useState<number>(0);
  const [currentAPR, setCurrentAPR] = useState(0);
  const [availableBalances, setAvailableBalances] = useState<
    Record<string, number>
  >({});
  const [isFinancier, setIsFinancier] = useState(false);
  const [allStakesInfo, setAllStakesInfo] = useState<AllStakesInfo | null>(
    null,
  );
  const [stakingConfig, setStakingConfig] = useState<StakingConfig | null>(
    null,
  );

  // Pool Guarantee state
  const [showDraftReview, setShowDraftReview] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);

  // Governance state
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalCategory, setProposalCategory] = useState<
    "Treasury" | "Investment" | "Guarantee"
  >("Treasury");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [daoStats, setDAOStats] = useState<DAOStats | null>(null);
  const [daoConfig, setDAOConfig] = useState<DAOConfig | null>(null);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [isApplyingFinancier, setIsApplyingFinancier] = useState(false);
  const [voteStatuses, setVoteStatuses] = useState<Record<string, VoteStatus>>(
    {},
  );

  // Prevent re-initialization on screen navigation
  const hasInitialized = useRef(false);
  const lastInitializedKey = useRef<string | null>(null);
  const hasLoadedData = useRef(false); // Track if data has been loaded successfully
  const hasLoadedCache = useRef(false); // Prevent overwriting cache with zeros

  // Storage keys for cache
  const getCacheKey = (suffix: string) =>
    `treasury_portal_${address}_${selectedNetwork.chainId}_${suffix}`;

  const safeParse = <T,>(value: string | null, fallback: T): T => {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };

  // Load cached data instantly on mount
  const loadCachedData = useCallback(async (): Promise<boolean> => {
    if (!address) return false;

    const startTime = performance.now();
    console.log("[TreasuryPortal] ⚡ Loading cached data...");

    try {
      const memoryKey = `${address}_${selectedNetwork.chainId}`;
      const memoryCache = treasuryPortalMemoryCache.get(memoryKey);

      if (memoryCache) {
        setUserTotalStakedUSD(memoryCache.userTotalStakedUSD);
        setUserVotingPowerPercentage(memoryCache.userVotingPowerPercentage);
        setGlobalPoolTotalUSD(memoryCache.globalPoolTotalUSD);
        setCurrentAPR(memoryCache.currentAPR);
        setIsFinancier(memoryCache.isFinancier);
        if (Object.keys(memoryCache.availableBalances || {}).length > 0) {
          setAvailableBalances(memoryCache.availableBalances);
        }
        setAllStakesInfo(memoryCache.allStakesInfo);
        setStakingConfig(memoryCache.stakingConfig);
        setProposals(memoryCache.proposals);
        setDAOStats(memoryCache.daoStats);
        setDAOConfig(memoryCache.daoConfig);
        hasLoadedCache.current = true;
        console.log("[TreasuryPortal] ⚡ Memory cache hit - instant render");
        return true;
      }

      const summaryKeys = [
        "userTotalStakedUSD",
        "userVotingPowerPercentage",
        "globalPoolTotalUSD",
        "currentAPR",
        "isFinancier",
        "availableBalances",
      ];

      const summaryResults = await Promise.all(
        summaryKeys.map((key) => AsyncStorage.getItem(getCacheKey(key))),
      );

      const hasCache = summaryResults.some((value) => value !== null);

      if (summaryResults[0])
        setUserTotalStakedUSD(parseFloat(summaryResults[0]));
      if (summaryResults[1])
        setUserVotingPowerPercentage(parseFloat(summaryResults[1]));
      if (summaryResults[2])
        setGlobalPoolTotalUSD(parseFloat(summaryResults[2]));
      if (summaryResults[3]) setCurrentAPR(parseFloat(summaryResults[3]));
      if (summaryResults[4]) setIsFinancier(summaryResults[4] === "true");
      if (summaryResults[5]) {
        const cachedAvailable = safeParse<Record<string, number>>(
          summaryResults[5],
          {},
        );
        if (Object.keys(cachedAvailable).length > 0) {
          setAvailableBalances(cachedAvailable);
        }
      }

      hasLoadedCache.current = hasCache;
      const loadTime = performance.now() - startTime;
      console.log(
        `[TreasuryPortal] ⚡ Summary cache loaded in ${loadTime.toFixed(2)}ms`,
      );

      // Load heavy data in background
      setTimeout(async () => {
        try {
          const heavyKeys = [
            "allStakesInfo",
            "stakingConfig",
            "proposals",
            "daoStats",
            "daoConfig",
          ];

          const heavyResults = await Promise.all(
            heavyKeys.map((key) => AsyncStorage.getItem(getCacheKey(key))),
          );

          setAllStakesInfo(safeParse(heavyResults[0], null));
          setStakingConfig(safeParse(heavyResults[1], null));
          setProposals(safeParse(heavyResults[2], []));
          setDAOStats(safeParse(heavyResults[3], null));
          setDAOConfig(safeParse(heavyResults[4], null));
        } catch (error) {
          console.error("[TreasuryPortal] Heavy cache load error:", error);
        }
      }, 0);

      return hasCache;
    } catch (error) {
      console.error("[TreasuryPortal] Cache load error:", error);
      return false;
    }
  }, [address, selectedNetwork.chainId]);

  // Persist data to cache (fire-and-forget)
  const persistData = useCallback(() => {
    if (!address) return;

    const memoryKey = `${address}_${selectedNetwork.chainId}`;
    treasuryPortalMemoryCache.set(memoryKey, {
      userTotalStakedUSD,
      userVotingPowerPercentage,
      globalPoolTotalUSD,
      currentAPR,
      isFinancier,
      availableBalances,
      allStakesInfo,
      stakingConfig,
      proposals,
      daoStats,
      daoConfig,
      lastUpdated: Date.now(),
    });

    const cacheData = {
      userTotalStakedUSD: userTotalStakedUSD.toString(),
      userVotingPowerPercentage: userVotingPowerPercentage.toString(),
      globalPoolTotalUSD: globalPoolTotalUSD.toString(),
      currentAPR: currentAPR.toString(),
      isFinancier: isFinancier.toString(),
      availableBalances: JSON.stringify(availableBalances),
      allStakesInfo: JSON.stringify(allStakesInfo),
      stakingConfig: JSON.stringify(stakingConfig),
      proposals: JSON.stringify(proposals),
      daoStats: JSON.stringify(daoStats),
      daoConfig: JSON.stringify(daoConfig),
    };

    // Fire-and-forget - don't await
    Promise.all(
      Object.entries(cacheData).map(([key, value]) =>
        AsyncStorage.setItem(getCacheKey(key), value),
      ),
    ).catch((err) =>
      console.error("[TreasuryPortal] Cache persist error:", err),
    );
  }, [
    address,
    selectedNetwork.chainId,
    userTotalStakedUSD,
    userVotingPowerPercentage,
    globalPoolTotalUSD,
    currentAPR,
    isFinancier,
    availableBalances,
    allStakesInfo,
    stakingConfig,
    proposals,
    daoStats,
    daoConfig,
  ]);

  // Persist cache whenever key data changes
  useEffect(() => {
    if (!address || !isUnlocked) return;
    if (!hasLoadedData.current) return;
    persistData();
  }, [address, isUnlocked, persistData]);

  const stakedForSelectedToken = useMemo(() => {
    if (!allStakesInfo || !selectedToken) return 0;
    const tokenIdx = allStakesInfo.tokens.findIndex(
      (addr) => addr.toLowerCase() === selectedToken.address.toLowerCase(),
    );
    if (tokenIdx >= 0) {
      const staked = parseFloat(allStakesInfo.amounts[tokenIdx] || "0");
      return Number.isNaN(staked) ? 0 : staked;
    }
    return 0;
  }, [allStakesInfo, selectedToken]);

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

  // Initialize - load cache immediately, then sync if needed
  useEffect(() => {
    if (!isUnlocked || !address) {
      hasInitialized.current = false;
      lastInitializedKey.current = null;
      hasLoadedData.current = false;
      return;
    }

    const initialize = async () => {
      const initKey = `${address}_${selectedNetwork.chainId}`;

      // ALWAYS load cache first for instant display
      const hasCache = await loadCachedData();

      // If cache exists, show instantly, then refresh in background
      if (hasCache) {
        console.log("[TreasuryPortal] 🚀 Cache hit - refreshing in background");
        hasInitialized.current = true;
        lastInitializedKey.current = initKey;
        loadInitialData({ force: true, silent: true });
        return;
      }

      if (hasInitialized.current && lastInitializedKey.current === initKey) {
        console.log(
          "[TreasuryPortal] 🚀 Already initialized - using cached data only",
        );
        return;
      }

      console.log("[TreasuryPortal] Initializing for first time...");
      await loadInitialData();
      hasInitialized.current = true;
      lastInitializedKey.current = initKey;
    };

    initialize();
  }, [isUnlocked, selectedNetwork, address, loadCachedData]);

  useEffect(() => {
    const tokens = getSupportedStablecoins(selectedNetwork.chainId);
    setSupportedTokens(tokens);
    if (tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens[0]);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    if (isFinancier && actionMode === "unstake") {
      setActionMode("revoke");
    } else if (!isFinancier && actionMode === "revoke") {
      setActionMode("stake");
    }
  }, [isFinancier, actionMode]);

  useEffect(() => {
    if (isFinancier && stakeAsFinancier) {
      setStakeAsFinancier(false);
    }
  }, [isFinancier, stakeAsFinancier]);

  const loadInitialData = async (options?: {
    force?: boolean;
    silent?: boolean;
  }) => {
    if (!isUnlocked || !address) return;

    // Skip loading if we already have data for this wallet/network
    const currentKey = `${address}_${selectedNetwork.chainId}`;
    if (
      !options?.force &&
      hasLoadedData.current &&
      lastInitializedKey.current === currentKey
    ) {
      console.log(
        "[TreasuryPortal] ⚡ Using cached data - skipping blockchain calls",
      );
      return;
    }

    try {
      console.log("[TreasuryPortal] 🔄 Loading fresh data from blockchain...");
      if (
        !options?.silent &&
        userTotalStakedUSD === 0 &&
        globalPoolTotalUSD === 0
      ) {
        setIsLoading(true);
      }

      await Promise.allSettled([
        loadStakingData(),
        loadFinancierStatus(),
        loadGovernanceData(),
      ]);

      // Persist to cache (fire-and-forget)
      persistData();

      hasLoadedData.current = true; // Mark as successfully loaded
      console.log("[TreasuryPortal] ✅ Data loaded and cached");
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  };

  const loadStakingData = async () => {
    try {
      // Keep the user's currently selected network so we can restore it after cross-network aggregation
      const originalNetwork = selectedNetwork;

      // Aggregate across all deployed chains (Sepolia testnets for now)
      const aggregationOrder: SupportedNetworkId[] = [
        "ethereum-sepolia",
        "lisk-sepolia",
        "base-sepolia",
      ];

      let aggregatedUserTotalUSD = 0;
      let aggregatedVotingPower = 0;
      let votingNetworksCount = 0;
      let aggregatedGlobalPoolUSD = 0;

      // Build token metadata upfront for symbol lookups
      const tokenMetaMap: Record<string, { symbol: string }> = {};
      aggregationOrder.forEach((id) => {
        const tokens = getAllSupportedTokens(id);
        tokens.forEach((t) => {
          tokenMetaMap[t.address.toLowerCase()] = { symbol: t.symbol };
        });
      });

      const aggregatedStakedBySymbol: Record<string, number> = {};

      try {
        for (const networkId of aggregationOrder) {
          const network = getNetworkById(networkId);
          if (!network) continue;

          // Point the staking service to this network for the query
          stakingService.setNetwork(network.chainId, network);

          // Per-network stakes for this user
          const stakes = await stakingService.getAllStakesForUser(address);
          const networkTotal = parseFloat(stakes.totalUsdValue || "0");
          if (!Number.isNaN(networkTotal)) {
            aggregatedUserTotalUSD += networkTotal;
          }

          // Accumulate staked token amounts by symbol (for MAX/availability UI)
          stakes.tokens.forEach((tokenAddr, idx) => {
            const meta = tokenMetaMap[tokenAddr.toLowerCase()];
            const symbol = meta?.symbol || "TOKEN";
            const amount = parseFloat(stakes.amounts[idx] || "0");
            if (!Number.isNaN(amount)) {
              aggregatedStakedBySymbol[symbol] =
                (aggregatedStakedBySymbol[symbol] || 0) + amount;
            }
          });

          // Global pool total (best-effort) using read-only calls
          const diamondAddress = DIAMOND_ADDRESSES[network.chainId];
          if (diamondAddress) {
            try {
              const provider = new ethers.providers.JsonRpcProvider(
                network.rpcUrl,
              );
              const poolReader = new ethers.Contract(
                diamondAddress,
                POOL_READ_ABI,
                provider,
              );

              // Preferred: getTotalStakedUSD if available
              let networkPoolUSD = 0;
              try {
                const totalStakedUSD = await poolReader.getTotalStakedUSD();
                networkPoolUSD = parseFloat(
                  ethers.utils.formatUnits(totalStakedUSD, 6),
                );
              } catch (innerErr) {
                // Fallback: sum all stakers' totalUsdValue (potentially heavier but acceptable on testnets)
                try {
                  const stakers: string[] = await poolReader.getStakers();
                  let summed = 0;
                  for (const staker of stakers) {
                    const stakeData =
                      await poolReader.getAllStakesForUser(staker);
                    summed += parseFloat(
                      ethers.utils.formatUnits(stakeData.totalUsdValue, 6),
                    );
                  }
                  networkPoolUSD = summed;
                } catch (fallbackErr) {
                  console.warn(
                    "Global pool fallback failed for",
                    networkId,
                    fallbackErr,
                  );
                }
              }

              if (!Number.isNaN(networkPoolUSD)) {
                aggregatedGlobalPoolUSD += networkPoolUSD;
              }
            } catch (err) {
              console.warn("Global pool lookup failed for", networkId, err);
            }
          }

          // Voting power (per-network) via getStake
          try {
            const provider = new ethers.providers.JsonRpcProvider(
              network.rpcUrl,
            );
            const diamondAddress = DIAMOND_ADDRESSES[network.chainId];
            if (diamondAddress) {
              const stakeContract = new ethers.Contract(
                diamondAddress,
                [
                  "function getStake(address staker) view returns (uint256 amount, uint256 timestamp, uint256 votingPower, bool active, uint256 pendingRewards, uint256 timeUntilUnlock, uint256 deadline, bool financierStatus)",
                ],
                provider,
              );
              const stake = await stakeContract.getStake(address);
              const vp = parseFloat(
                ethers.utils.formatUnits(stake.votingPower, 6),
              );
              if (!Number.isNaN(vp)) {
                aggregatedVotingPower += vp;
                votingNetworksCount += 1;
              }
            }
          } catch (err) {
            console.warn("Voting power lookup failed for", networkId, err);
          }
        }
      } finally {
        // Restore staking service to the originally selected network for all subsequent transactions
        stakingService.setNetwork(originalNetwork.chainId, originalNetwork);
      }

      // Fetch current-network stakes for transactional actions (stake/unstake)
      const currentNetworkStakes =
        await stakingService.getAllStakesForUser(address);
      setAllStakesInfo(currentNetworkStakes);

      // Persist aggregates for UI
      setUserTotalStakedUSD(aggregatedUserTotalUSD);
      if (Object.keys(aggregatedStakedBySymbol).length > 0) {
        setAvailableBalances(aggregatedStakedBySymbol);
      }

      const poolTotal = aggregatedGlobalPoolUSD || aggregatedUserTotalUSD;
      setGlobalPoolTotalUSD(poolTotal);

      const votingPower =
        votingNetworksCount > 0
          ? (aggregatedVotingPower / votingNetworksCount) * 100
          : 0;
      setUserVotingPowerPercentage(votingPower);

      // APR from current network config (use currentRewardRate if present, else initialApr)
      const config = await stakingService.getStakingConfig();
      setStakingConfig(config);
      const apr =
        (config.currentRewardRate ?? 0) > 0
          ? config.currentRewardRate
          : (config.initialApr ?? 0);
      setCurrentAPR(apr);

      // Wallet balances (available funds) override the staked map when present
      const walletTokens = displayBalances?.tokens?.length
        ? displayBalances.tokens
        : balances?.tokens;
      if (walletTokens?.length) {
        const walletBalanceMap: Record<string, number> = {};
        walletTokens.forEach((t) => {
          const amt = parseFloat(t.balance || "0");
          if (!Number.isNaN(amt)) {
            walletBalanceMap[t.symbol] = amt;
          }
        });
        if (Object.keys(walletBalanceMap).length > 0) {
          setAvailableBalances(walletBalanceMap);
        }
      }
    } catch (error) {
      console.error("Error loading staking data:", error);
      // Preserve previous values to avoid blank UI
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
    hasLoadedData.current = false; // Clear cache to force fresh data load
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
      await loadInitialData({ force: true });
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
      await loadInitialData({ force: true });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to unstake");
    } finally {
      setIsTransacting(false);
    }
  };

  const handleRevokeFinancier = async () => {
    Alert.alert(
      "Revoke Financier Status",
      "This will start the financier revocation process. You will lose proposal/voting rights until completed. Proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Revocation",
          onPress: async () => {
            try {
              setIsTransacting(true);
              stakingService.setNetwork(
                selectedNetwork.chainId,
                selectedNetwork,
              );
              await stakingService.requestFinancierRevocation();
              Alert.alert(
                "Revocation Requested",
                "Your revocation has been requested. Complete it after the cooldown.",
              );
              await Promise.all([loadFinancierStatus(), loadStakingData()]);
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.message || "Failed to request revocation",
              );
            } finally {
              setIsTransacting(false);
            }
          },
        },
      ],
    );
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

  const loadGovernanceData = async () => {
    if (!address) return;

    try {
      setIsLoadingProposals(true);
      stakingService.setNetwork(selectedNetwork.chainId, selectedNetwork);

      // Try to load governance data, gracefully handle if not available
      const [allProposals, stats, config] = await Promise.allSettled([
        stakingService.getAllProposals(),
        stakingService.getDAOStats(),
        stakingService.getDAOConfig(),
      ]);

      // Extract results with fallbacks
      const proposalList =
        allProposals.status === "fulfilled" ? allProposals.value : [];
      const daoStats =
        stats.status === "fulfilled"
          ? stats.value
          : {
              totalProposals: 0,
              activeProposals: 0,
              passedProposals: 0,
              executedProposals: 0,
            };
      const daoConfig = config.status === "fulfilled" ? config.value : null;

      setProposals(proposalList);
      setDAOStats(daoStats);
      if (daoConfig) {
        setDAOConfig(daoConfig);
      }

      // Check if governance is available
      const governanceAvailable =
        allProposals.status === "fulfilled" ||
        stats.status === "fulfilled" ||
        config.status === "fulfilled";

      if (!governanceAvailable) {
        console.log(
          "[TreasuryPortal] ℹ️ Governance features not available on this network",
        );
        return; // Skip vote status fetching
      }

      // Fetch vote status for each proposal (only if we have proposals)
      if (proposalList.length > 0) {
        const voteStatusMap: Record<string, VoteStatus> = {};
        await Promise.all(
          proposalList.map(async (proposal) => {
            try {
              const status = await stakingService.getVoteStatus(proposal.id);
              voteStatusMap[proposal.id] = status;
            } catch (error) {
              console.error(
                `Error fetching vote status for ${proposal.id}:`,
                error,
              );
              voteStatusMap[proposal.id] = { hasVoted: false, support: false };
            }
          }),
        );
        setVoteStatuses(voteStatusMap);
      }
    } catch (error) {
      console.error("Error loading governance data:", error);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!proposalTitle.trim() || !proposalDescription.trim()) {
      Alert.alert(
        "Missing Information",
        "Please fill in both title and description for your proposal.",
      );
      return;
    }

    const proposalId = `proposal-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    Alert.alert(
      "Submit Proposal",
      `Submit proposal "${proposalTitle.trim()}" for voting?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            try {
              setIsTransacting(true);
              stakingService.setNetwork(
                selectedNetwork.chainId,
                selectedNetwork,
              );

              const tx = await stakingService.createProposal(
                proposalId,
                proposalCategory,
                proposalTitle.trim(),
                proposalDescription.trim(),
              );

              Alert.alert(
                "Proposal Submitted!",
                `Tx Hash: ${tx.hash}\nIt will appear in the voting list once confirmed.`,
              );

              setProposalTitle("");
              setProposalDescription("");
              setProposalCategory("Treasury");

              setTimeout(() => loadGovernanceData(), 2500);
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
  };

  const handleVoteOnProposal = async (proposalId: string, support: boolean) => {
    try {
      setIsTransacting(true);
      stakingService.setNetwork(selectedNetwork.chainId, selectedNetwork);
      const tx = await stakingService.voteOnProposal(proposalId, support);

      Alert.alert(
        "Vote Submitted!",
        `Tx Hash: ${tx.hash}\nYou voted ${support ? "IN SUPPORT" : "AGAINST"}.`,
      );

      setTimeout(() => loadGovernanceData(), 2000);
    } catch (error: any) {
      console.error("Vote error:", error);
      Alert.alert("Vote Failed", error.message || "Failed to submit vote");
    } finally {
      setIsTransacting(false);
    }
  };

  const handleApplyAsFinancier = async () => {
    try {
      setIsApplyingFinancier(true);
      stakingService.setNetwork(selectedNetwork.chainId, selectedNetwork);

      const minStake = parseFloat(stakingConfig?.minimumFinancierStake || "0");
      const currentStake = parseFloat(allStakesInfo?.totalUsdValue || "0");

      if (currentStake < minStake) {
        Alert.alert(
          "Insufficient Stake",
          `You need at least ${minStake} staked to become a financier. Current: ${currentStake.toFixed(2)}.`,
        );
        setIsApplyingFinancier(false);
        return;
      }

      const tx = await stakingService.applyAsFinancier();
      Alert.alert(
        "Application Submitted",
        `Tx Hash: ${tx.hash}\nYou'll gain proposal and voting rights once confirmed.`,
      );

      setTimeout(() => {
        loadFinancierStatus();
        loadStakingData();
      }, 2500);
    } catch (error: any) {
      console.error("Apply as financier error:", error);
      Alert.alert("Application Failed", error.message || "Failed to apply");
    } finally {
      setIsApplyingFinancier(false);
    }
  };

  const getTimeLeft = (deadline: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = deadline - now;
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const handleMaxAmount = () => {
    if (actionMode === "stake") {
      const balance = availableBalances[selectedToken?.symbol || ""] || 0;
      setStakeAmount(balance.toString());
    } else if (actionMode === "unstake") {
      setStakeAmount(stakedForSelectedToken.toString());
    } else {
      setStakeAmount("0");
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
            value={globalPoolTotalUSD.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
          <StatCard
            icon="wallet"
            label="Available"
            value={
              selectedToken
                ? (availableBalances[selectedToken.symbol] || 0).toFixed(2)
                : "0"
            }
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
          {isFinancier ? (
            <ActionModeButton
              icon="account-cancel"
              label="Revoke"
              value="revoke"
              active={actionMode === "revoke"}
              onPress={() => setActionMode("revoke")}
            />
          ) : (
            <ActionModeButton
              icon="minus"
              label="Unstake"
              value="unstake"
              active={actionMode === "unstake"}
              onPress={() => setActionMode("unstake")}
            />
          )}
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

          {/* Financier Option (only visible for non-financiers) */}
          {!isFinancier && (
            <TouchableOpacity
              style={styles.financierOption}
              onPress={() => setStakeAsFinancier(!stakeAsFinancier)}
            >
              <MaterialCommunityIcons
                name={
                  stakeAsFinancier
                    ? "checkbox-marked"
                    : "checkbox-blank-outline"
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
          )}

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
      {actionMode === "unstake" && !isFinancier && (
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
                Staked: {stakedForSelectedToken.toFixed(2)}{" "}
                {selectedToken?.symbol}
              </Text>
              <Text style={styles.inputInfoText}>
                Unlock or penalty may apply
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.unstakeButton, { flex: 1 }]}
            onPress={handleUnstake}
            disabled={isTransacting}
          >
            {isTransacting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="cash-minus"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.unstakeButtonText}>
                  Unstake {selectedToken?.symbol}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.warningBox}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={16}
              color={palette.errorRed}
            />
            <Text style={styles.warningBoxText}>
              Unstaking before lock expiry may incur a penalty. Review the lock
              timer in your position details.
            </Text>
          </View>
        </View>
      )}

      {/* Revoke Section */}
      {actionMode === "revoke" && (
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Financier Revocation</Text>
          <Text style={styles.infoBoxText}>
            Request to revoke your financier status. You will keep your stake
            but lose proposal and voting rights after completion.
          </Text>

          <TouchableOpacity
            style={[styles.unstakeButton, { flex: 1 }]}
            onPress={handleRevokeFinancier}
            disabled={isTransacting}
          >
            {isTransacting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="account-cancel"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.unstakeButtonText}>Request Revocation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderCreateTab = () => {
    const minStake = parseFloat(stakingConfig?.minimumFinancierStake || "0");
    const currentStake = parseFloat(allStakesInfo?.totalUsdValue || "0");

    if (!isFinancier) {
      const disabled =
        isApplyingFinancier ||
        Number.isNaN(minStake) ||
        currentStake < minStake;
      return (
        <View style={styles.content}>
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons
                name="account-star"
                size={24}
                color={palette.primaryBlue}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Become a Financier</Text>
                <Text style={styles.cardSubtitle}>
                  Create proposals and gain governance rights.
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Minimum stake</Text>
              <Text style={styles.infoValue}>{minStake.toFixed(2)} USDC</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Your current stake</Text>
              <Text style={styles.infoValue}>
                {currentStake.toFixed(2)} USDC
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.ctaButton, disabled && styles.buttonDisabled]}
              onPress={handleApplyAsFinancier}
              disabled={disabled}
            >
              {isApplyingFinancier ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaButtonText}>Apply as Financier</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="plus-circle"
              size={24}
              color={palette.primaryBlue}
            />
            <Text style={styles.cardTitle}>Create New Proposal</Text>
          </View>

          <Text style={styles.cardSubtitle}>
            Submit a proposal for the treasury community to vote on.
          </Text>

          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.pillRow}>
            {(["Treasury", "Investment", "Guarantee"] as const).map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.pill,
                  proposalCategory === cat && styles.pillActive,
                ]}
                onPress={() => setProposalCategory(cat)}
              >
                <Text
                  style={[
                    styles.pillText,
                    proposalCategory === cat && styles.pillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.textInput}
            value={proposalTitle}
            onChangeText={setProposalTitle}
            placeholder="Clear, concise proposal title"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.textArea}
            value={proposalDescription}
            onChangeText={setProposalDescription}
            placeholder="Objectives, plan, and expected outcomes"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              styles.ctaButton,
              (!proposalTitle.trim() || !proposalDescription.trim()) &&
                styles.buttonDisabled,
            ]}
            onPress={handleCreateProposal}
            disabled={
              !proposalTitle.trim() ||
              !proposalDescription.trim() ||
              isTransacting
            }
          >
            {isTransacting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaButtonText}>Submit Proposal</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderVoteTab = () => {
    if (!isFinancier) {
      return (
        <View style={styles.content}>
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons
                name="vote"
                size={24}
                color={palette.primaryBlue}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Voting Requires Financier</Text>
                <Text style={styles.cardSubtitle}>
                  Apply as a financier to participate in governance.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.ctaButton, styles.buttonSecondary]}
              onPress={() => setActiveTab("create")}
            >
              <Text style={styles.ctaButtonText}>See how to qualify</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Treasury Voting</Text>
          <TouchableOpacity
            onPress={loadGovernanceData}
            disabled={isLoadingProposals}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={20}
              color={palette.primaryBlue}
            />
          </TouchableOpacity>
        </View>

        {isLoadingProposals ? (
          <ActivityIndicator color={palette.primaryBlue} />
        ) : proposals.length === 0 ? (
          <View style={styles.placeholderCard}>
            <MaterialCommunityIcons
              name="vote-outline"
              size={48}
              color={palette.neutralMid}
            />
            <Text style={styles.placeholderTitle}>No proposals yet</Text>
            <Text style={styles.placeholderText}>
              Create one in the Create tab to get started.
            </Text>
          </View>
        ) : (
          proposals.map((proposal) => {
            const totalVotes =
              parseFloat(proposal.votesFor) + parseFloat(proposal.votesAgainst);
            const forPct =
              totalVotes > 0
                ? (parseFloat(proposal.votesFor) / totalVotes) * 100
                : 0;
            const now = Math.floor(Date.now() / 1000);
            const isActive =
              proposal.votingDeadline > now && !proposal.executed;
            const statusLabel = proposal.executed
              ? "Executed"
              : isActive
                ? "Active"
                : "Ended";

            return (
              <View key={proposal.id} style={styles.proposalCard}>
                <View style={styles.proposalHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{proposal.category}</Text>
                  </View>
                  <View
                    style={[
                      styles.proposalStatusBadge,
                      isActive
                        ? styles.proposalStatusBadgeActive
                        : styles.proposalStatusBadgeEnded,
                    ]}
                  >
                    <Text style={styles.proposalStatusBadgeText}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                <Text style={styles.proposalTitle}>{proposal.title}</Text>
                <Text style={styles.proposalDescription} numberOfLines={3}>
                  {proposal.description}
                </Text>

                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${forPct}%` }]}
                  />
                </View>
                <View style={styles.voteNumbers}>
                  <Text style={styles.voteFor}>For: {proposal.votesFor}</Text>
                  <Text style={styles.voteAgainst}>
                    Against: {proposal.votesAgainst}
                  </Text>
                </View>

                <Text style={styles.timeLeftText}>
                  {getTimeLeft(proposal.votingDeadline)} left to vote
                </Text>

                {isActive && (
                  <View style={styles.voteActions}>
                    {voteStatuses[proposal.id]?.hasVoted ? (
                      <View style={styles.votedIndicator}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={palette.primaryBlue}
                        />
                        <Text style={styles.votedText}>
                          You voted{" "}
                          {voteStatuses[proposal.id]?.support
                            ? "FOR"
                            : "AGAINST"}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.voteButton, styles.voteButtonFor]}
                          onPress={() =>
                            handleVoteOnProposal(proposal.id, true)
                          }
                          disabled={isTransacting}
                        >
                          <Text style={styles.voteButtonText}>Vote For</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.voteButton, styles.voteButtonAgainst]}
                          onPress={() =>
                            handleVoteOnProposal(proposal.id, false)
                          }
                          disabled={isTransacting}
                        >
                          <Text style={styles.voteButtonText}>
                            Vote Against
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    );
  };

  const renderPoolTab = () => {
    const votingApps = applications.filter(
      (app) => app.status === "Draft Sent to Pool",
    );

    if (!isFinancier) {
      return (
        <View style={styles.content}>
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons
                name="shield-lock"
                size={24}
                color={palette.primaryBlue}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Financier Access Required</Text>
                <Text style={styles.cardSubtitle}>
                  Reviewing and voting on pool guarantees is restricted to
                  authorized financiers.
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pool Guarantee Voting</Text>
          <View style={styles.badgeSmall}>
            <Text style={styles.badgeTextSmall}>
              {votingApps.length} Pending
            </Text>
          </View>
        </View>

        {votingApps.length === 0 ? (
          <View style={styles.placeholderCard}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={48}
              color={palette.neutralMid}
            />
            <Text style={styles.placeholderTitle}>All Caught Up!</Text>
            <Text style={styles.placeholderText}>
              There are no new pool guarantee applications awaiting votes.
            </Text>
          </View>
        ) : (
          votingApps.map((app) => (
            <View key={app.id} style={styles.pgaVoteCard}>
              <View style={styles.pgaCardHeader}>
                <View style={styles.pgaIconContainer}>
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={24}
                    color={palette.primaryBlue}
                  />
                </View>
                <View style={styles.pgaHeaderText}>
                  <Text style={styles.pgaTitle}>
                    {app.companyName || "Pool Application"}
                  </Text>
                  <Text style={styles.pgaSubtitle} numberOfLines={1}>
                    {app.tradeDescription}
                  </Text>
                </View>
              </View>

              <View style={styles.pgaDetailsRow}>
                <View style={styles.pgaDetailItem}>
                  <Text style={styles.pgaDetailLabel}>Guarantee</Text>
                  <Text style={styles.pgaDetailValue}>
                    {app.guaranteeAmount}
                  </Text>
                </View>
                <View style={styles.pgaDetailItem}>
                  <Text style={styles.pgaDetailLabel}>Collateral</Text>
                  <Text style={styles.pgaDetailValue}>
                    {app.collateralValue}
                  </Text>
                </View>
                <View style={styles.pgaDetailItem}>
                  <Text style={styles.pgaDetailLabel}>Duration</Text>
                  <Text style={styles.pgaDetailValue}>
                    {app.financingDuration}d
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.pgaReviewButton}
                onPress={() => {
                  setSelectedDraft({
                    ...app,
                    applicant: app.buyer,
                    beneficiary: app.seller,
                    guaranteeNo: app.requestId,
                  });
                  setShowDraftReview(true);
                }}
              >
                <MaterialCommunityIcons
                  name="eye"
                  size={16}
                  color={palette.primaryBlue}
                />
                <Text style={styles.pgaReviewButtonText}>
                  Review Application
                </Text>
              </TouchableOpacity>

              <View style={styles.pgaActionButtons}>
                <TouchableOpacity
                  style={[styles.pgaVoteButton, styles.pgaButtonReject]}
                  onPress={() => votePGABlockchain(app.id, false)}
                >
                  <MaterialCommunityIcons
                    name="thumb-down"
                    size={18}
                    color="#EF4444"
                  />
                  <Text
                    style={[styles.pgaVoteButtonText, { color: "#EF4444" }]}
                  >
                    Reject
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pgaVoteButton, styles.pgaButtonApprove]}
                  onPress={() => votePGABlockchain(app.id, true)}
                >
                  <MaterialCommunityIcons
                    name="thumb-up"
                    size={18}
                    color="#10B981"
                  />
                  <Text
                    style={[styles.pgaVoteButtonText, { color: "#10B981" }]}
                  >
                    Approve
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <Modal
          visible={showDraftReview}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDraftReview(false)}
        >
          {selectedDraft && (
            <SellerDraftView
              draft={selectedDraft}
              onApprove={() => {
                votePGABlockchain(selectedDraft.id, true);
                setShowDraftReview(false);
              }}
              onReject={() => {
                votePGABlockchain(selectedDraft.id, false);
                setShowDraftReview(false);
              }}
              onClose={() => setShowDraftReview(false)}
            />
          )}
        </Modal>
      </View>
    );
  };

  const renderOtherTabs = () => {
    if (activeTab === "create") return renderCreateTab();
    if (activeTab === "vote") return renderVoteTab();
    return renderPoolTab();
  };

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
    <Screen
      preset="scroll"
      backgroundColor={palette.surface}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={palette.primaryBlue}
          colors={[palette.primaryBlue]}
        />
      }
    >
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
  // Governance sections
  sectionCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  cardSubtitle: {
    fontSize: 14,
    color: palette.neutralMid,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 13,
    color: palette.neutralMid,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  ctaButton: {
    backgroundColor: palette.primaryBlue,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  buttonSecondary: {
    backgroundColor: palette.neutralLighter,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  pillRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    backgroundColor: palette.surface,
  },
  pillActive: {
    backgroundColor: palette.primaryBlue,
    borderColor: palette.primaryBlue,
  },
  pillText: {
    color: palette.neutralDark,
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  textInput: {
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: palette.surface,
    color: palette.neutralDark,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: palette.surface,
    minHeight: 140,
    color: palette.neutralDark,
    fontSize: 15,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  proposalCard: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  proposalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: palette.surface,
  },
  badgeText: {
    color: palette.primaryBlue,
    fontWeight: "700",
    fontSize: 12,
  },
  proposalStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  proposalStatusBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  proposalStatusBadgeEnded: {
    backgroundColor: "#F3F4F6",
  },
  proposalStatusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  proposalDescription: {
    fontSize: 14,
    color: palette.neutralMid,
  },
  progressBar: {
    height: 6,
    backgroundColor: palette.neutralLighter,
    borderRadius: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.primaryBlue,
  },
  voteNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  voteFor: {
    color: palette.neutralDark,
    fontWeight: "600",
  },
  voteAgainst: {
    color: palette.neutralDark,
    fontWeight: "600",
  },
  timeLeftText: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  voteActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  voteButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  voteButtonFor: {
    backgroundColor: palette.primaryBlue,
  },
  voteButtonAgainst: {
    backgroundColor: palette.errorRed,
  },
  voteButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  votedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "#E8F4FD",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.primaryBlue,
  },
  votedText: {
    color: palette.primaryBlue,
    fontWeight: "600",
    fontSize: 14,
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
  badgeSmall: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: palette.primaryBlue + "15",
  },
  badgeTextSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.primaryBlue,
  },
  pgaVoteCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pgaCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pgaIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primaryBlue + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  pgaHeaderText: {
    flex: 1,
  },
  pgaTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  pgaSubtitle: {
    fontSize: 13,
    color: palette.neutralMid,
    marginTop: 2,
  },
  pgaDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: 12,
  },
  pgaDetailItem: {
    alignItems: "center",
    flex: 1,
  },
  pgaDetailLabel: {
    fontSize: 11,
    color: palette.neutralMid,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pgaDetailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  pgaReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    backgroundColor: palette.primaryBlue + "10",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: palette.primaryBlue,
    gap: spacing.xs,
  },
  pgaReviewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primaryBlue,
  },
  pgaActionButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  pgaVoteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  pgaButtonApprove: {
    backgroundColor: "#DCFCE7",
    borderColor: "#10B981",
  },
  pgaButtonReject: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
  },
  pgaVoteButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

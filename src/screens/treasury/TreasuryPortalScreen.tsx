import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WalletStackParamList } from "@/navigation/types";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useWallet } from "@/contexts/WalletContext";
import {
  stakingService,
  StakeInfo,
  PoolStats,
  StakingConfig,
  StakingTransaction,
  Proposal,
  DAOStats,
  DAOConfig,
} from "@/services/stakingService";
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
  const { selectedNetwork, isUnlocked, address } = useWallet();

  // Real staking state
  const [isLoading, setIsLoading] = useState(true);
  const [isTransacting, setIsTransacting] = useState(false);
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [stakingConfig, setStakingConfig] = useState<StakingConfig | null>(
    null
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
  const [isEligibleFinancier, setIsEligibleFinancier] = useState(false);
  const [stakeAsFinancier, setStakeAsFinancier] = useState(false);

  // Performance: Track loading states separately
  const [dataVersion, setDataVersion] = useState(0);
  const isInitialMount = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load staking data on component mount and when wallet changes
  const loadStakingData = useCallback(async () => {
    if (!isUnlocked || !address) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Check if we're on the correct network (Lisk Sepolia)
      if (selectedNetwork.chainId !== 4202) {
        Alert.alert(
          "Wrong Network",
          "Please switch to Lisk Sepolia network to use staking features.",
          [{ text: "OK" }]
        );
        setIsLoading(false);
        return;
      }

      // 🚀 Try to get preloaded data first
      const preloadedData = await dataPreloader.preloadAll(address, selectedNetwork.chainId);
      
      if (preloadedData.staking) {
        console.log('[TreasuryPortal] Using preloaded staking data');
        setStakeInfo(preloadedData.staking.stakeInfo);
        setPoolStats(preloadedData.staking.poolStats);
        setStakingConfig(preloadedData.staking.stakingConfig);
        setUsdcBalance(preloadedData.staking.usdcBalance);
        setCurrentAPR(preloadedData.staking.currentAPR);
        setIsEligibleFinancier(preloadedData.staking.isEligibleFinancier);
        setIsLoading(false);
        setDataVersion(v => v + 1);
        return;
      }

      // Initialize staking service with user's wallet credentials
      await initializeStakingService();

      // Performance: Use cache for frequently accessed data
      const cacheKey = `staking:${address}:${selectedNetwork.chainId}`;
      const cachedData = performanceCache.get<any>(cacheKey);

      if (cachedData && isInitialMount.current) {
        // Use cached data on initial load for instant UI
        console.log('[Perf] Using cached data for instant load');
        setStakeInfo(cachedData.stake);
        setPoolStats(cachedData.pool);
        setStakingConfig(cachedData.config);
        setUsdcBalance(cachedData.balance);
        setCurrentAPR(cachedData.apr);
        setIsEligibleFinancier(cachedData.isEligible);
        setIsLoading(false);
      }

      // Performance: Queue data fetching with priority
      const [stake, pool, config, balance, apr, isEligible] = await Promise.all([
        asyncQueue.enqueue(
          () => stakingService.getStakeInfo(address),
          TaskPriority.HIGH
        ),
        asyncQueue.enqueue(
          () => stakingService.getPoolStats(),
          TaskPriority.NORMAL
        ),
        asyncQueue.enqueue(
          () => stakingService.getStakingConfig(),
          TaskPriority.HIGH
        ),
        asyncQueue.enqueue(
          () => stakingService.getUSDCBalance(address),
          TaskPriority.NORMAL
        ),
        asyncQueue.enqueue(
          () => stakingService.calculateCurrentAPR(),
          TaskPriority.LOW
        ),
        asyncQueue.enqueue(
          () => stakingService.isEligibleFinancier(address),
          TaskPriority.HIGH
        ),
      ]);

      // Update state
      setStakeInfo(stake);
      setPoolStats(pool);
      setStakingConfig(config);
      setUsdcBalance(balance);
      setCurrentAPR(apr);
      setIsEligibleFinancier(isEligible);

      // Cache the results (5 minute TTL)
      performanceCache.set(cacheKey, {
        stake,
        pool,
        config,
        balance,
        apr,
        isEligible,
      }, 5 * 60 * 1000);

      setDataVersion(v => v + 1);
    } catch (error) {
      console.error("Failed to load staking data:", error);
      Alert.alert("Error", "Failed to load staking data. Please try again.");
    } finally {
      setIsLoading(false);
      isInitialMount.current = false;
    }
  }, [isUnlocked, address, selectedNetwork.chainId]);

  // Load governance data
  const loadGovernanceData = useCallback(async () => {
    if (!isUnlocked || !address || selectedNetwork.chainId !== 4202) {
      return;
    }

    try {
      setIsLoadingProposals(true);

      // 🚀 Try to get preloaded data first
      const preloadedData = await dataPreloader.preloadAll(address, selectedNetwork.chainId);
      
      if (preloadedData.governance) {
        console.log('[TreasuryPortal] Using preloaded governance data');
        setProposals(preloadedData.governance.proposals);
        setDAOStats(preloadedData.governance.daoStats);
        setDAOConfig(preloadedData.governance.daoConfig);
        setIsLoadingProposals(false);
        return;
      }

      await initializeStakingService();

      // Performance: Cache governance data
      const cacheKey = `governance:${address}:${selectedNetwork.chainId}`;
      const cachedData = performanceCache.get<any>(cacheKey);

      if (cachedData) {
        console.log('[Perf] Using cached governance data');
        setProposals(cachedData.proposals);
        setDAOStats(cachedData.stats);
        setDAOConfig(cachedData.config);
        setIsLoadingProposals(false);
      }

      // Performance: Queue governance data fetching
      const [allProposals, stats, config] = await Promise.all([
        asyncQueue.enqueue(
          () => stakingService.getAllProposals(),
          TaskPriority.NORMAL
        ),
        asyncQueue.enqueue(
          () => stakingService.getDAOStats(),
          TaskPriority.LOW
        ),
        asyncQueue.enqueue(
          () => stakingService.getDAOConfig(),
          TaskPriority.NORMAL
        ),
      ]);

      setProposals(allProposals);
      setDAOStats(stats);
      setDAOConfig(config);

      // Cache for 2 minutes
      performanceCache.set(cacheKey, {
        proposals: allProposals,
        stats,
        config,
      }, 2 * 60 * 1000);
    } catch (error) {
      console.error("Failed to load governance data:", error);
    } finally {
      setIsLoadingProposals(false);
    }
  }, [isUnlocked, address, selectedNetwork.chainId]);

  // Load data on mount and when wallet/network changes
  useEffect(() => {
    loadStakingData();
    loadGovernanceData();
  }, [isUnlocked, address, selectedNetwork.chainId]);

  // DEBUG: Log eligibility state changes
  useEffect(() => {
    console.log("🔍 ========== ELIGIBILITY STATE CHANGED ==========");
    console.log("🔍 isEligibleFinancier:", isEligibleFinancier);
    console.log("🔍 Type:", typeof isEligibleFinancier);
    console.log("🔍 Truthy check:", !!isEligibleFinancier);
    console.log("🔍 Negation (for conditionals):", !isEligibleFinancier);
    console.log("🔍 Should show prompt?", !isEligibleFinancier);
    console.log("🔍 Should show content?", isEligibleFinancier);
    console.log("🔍 ==============================================");
  }, [isEligibleFinancier]);

  // Load proposals when switching to vote tab
  useEffect(() => {
    if (activeTab === "vote" || activeTab === "create") {
      loadGovernanceData();
    }
  }, [activeTab]);

  // Performance: Debounced refresh to prevent excessive reloads
  const debouncedRefresh = useMemo(
    () => debounce(() => {
      if (!isTransacting) {
        loadStakingData();
      }
    }, 30000), // 30 seconds
    [isTransacting, loadStakingData]
  );

  // Refresh data periodically to stay up to date
  useEffect(() => {
    if (!isUnlocked || !address || selectedNetwork.chainId !== 4202) {
      return;
    }

    // Performance: Use timeout instead of interval for better control
    const scheduleRefresh = () => {
      loadingTimeoutRef.current = setTimeout(() => {
        debouncedRefresh();
        scheduleRefresh();
      }, 30000);
    };

    scheduleRefresh();

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isUnlocked, address, selectedNetwork.chainId, debouncedRefresh]);

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
                [{ text: "OK" }]
              );
            }
            break;

          case "deposit":
            Alert.alert(
              "Deposit Successful! 🎉",
              `Your treasury deposit has been processed successfully!\n\nTransaction Hash: ${transactionHash}`,
              [{ text: "OK" }]
            );
            break;

          case "governance":
            Alert.alert(
              "Governance Payment Successful! 🎉",
              `Your governance payment has been recorded!\n\nTransaction Hash: ${transactionHash}`,
              [{ text: "OK" }]
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
          pendingTx.hash
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
            failureReason
          );

          Alert.alert(
            "Transaction Failed",
            `Your ${pendingTx.type} transaction failed.\n\nReason: ${failureReason}\n\nTransaction: ${pendingTx.hash}`,
            [{ text: "OK" }]
          );
        }
        setPendingTx(null);
        setIsTransacting(false);
      } catch (error) {
        console.error("Transaction monitoring error:", error);
        Alert.alert(
          "Transaction Error",
          `Transaction may have failed. Please check your wallet and try again if needed.`,
          [{ text: "OK" }]
        );
        setPendingTx(null);
        setIsTransacting(false);
      }
    };

    monitorTransaction();
  }, [pendingTx]);

  // Initialize staking service with user's actual wallet credentials
  const initializeStakingService = async () => {
    try {
      if (!isUnlocked) {
        console.log("Wallet is locked, cannot initialize staking service");
        return;
      }

      // Use the actual user's wallet credentials from secure storage
      console.log(
        "Initializing staking service with user's wallet credentials..."
      );

      // The stakingService.getSigner() will automatically use the user's credentials
      // from secure storage (mnemonic or private key) - no need to pass hardcoded key
      const signer = await stakingService.getSigner();
      const signerAddress = await signer.getAddress();
      console.log("Staking service connected with user wallet:", signerAddress);
    } catch (error) {
      console.error("Failed to initialize staking service:", error);
      throw error;
    }
  };

  // Real staking transaction handlers with optimistic updates
  const handleStakeUSDC = useCallback(async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid stake amount");
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
        }stake amount is ${minStake} USDC`
      );
      return;
    }

    // Check USDC balance
    if (parseFloat(usdcBalance) < parseFloat(stakeAmount)) {
      Alert.alert(
        "Insufficient Balance",
        "You don't have enough USDC to stake this amount"
      );
      return;
    }

    try {
      setIsTransacting(true);
      setStakingProgress("Initializing...");

      // Initialize connection if not done already
      await initializeStakingService();

      // Stake with progress callbacks - use appropriate function
      let tx;
      if (stakeAsFinancier) {
        tx = await stakingService.stakeAsFinancier(
          stakeAmount,
          (stage, message) => {
            setStakingProgress(message);
            console.log(`Staking as financier progress [${stage}]: ${message}`);
          }
        );
      } else {
        tx = await stakingService.stake(stakeAmount, (stage, message) => {
          setStakingProgress(message);
          console.log(`Staking progress [${stage}]: ${message}`);
        });
      }

      setPendingTx(tx);
      setStakeAmount(""); // Clear input
      setStakeAsFinancier(false); // Reset checkbox
      setStakingProgress("");

      // Performance: Invalidate cache
      performanceCache.invalidatePattern(`staking:${address}`);

      Alert.alert(
        "Stake Submitted",
        `Your ${
          stakeAsFinancier ? "financier " : ""
        }stake transaction has been submitted. Please wait for confirmation.`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("Staking error:", error);
      setStakingProgress("");
      Alert.alert("Staking Failed", error.message);
    } finally {
      setIsTransacting(false);
    }
  }, [stakeAmount, stakingConfig, usdcBalance, stakeAsFinancier, address]);

  const handleUnstake = useCallback(async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid unstake amount");
      return;
    }

    // Basic validation - let contract handle the rest
    if (stakeInfo && parseFloat(unstakeAmount) > parseFloat(stakeInfo.amount)) {
      Alert.alert("Error", "Cannot unstake more than your staked amount");
      return;
    }

    try {
      setIsTransacting(true);
      await initializeStakingService();

      console.log("Attempting to unstake:", unstakeAmount, "USDC");
      console.log("Current stake info:", stakeInfo);

      const tx = await stakingService.unstake(unstakeAmount);
      setPendingTx(tx);
      setUnstakeAmount(""); // Clear input

      // Performance: Invalidate cache
      performanceCache.invalidatePattern(`staking:${address}`);

      Alert.alert(
        "Unstake Submitted",
        `Unstaking ${unstakeAmount} USDC. Transaction hash: ${tx.hash}`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("Unstake error:", error);
      Alert.alert("Unstaking Failed", error.message);
    } finally {
      setIsTransacting(false);
    }
  }, [unstakeAmount, stakeInfo, address]);

  const handleClaimRewards = useCallback(async () => {
    try {
      setIsTransacting(true);
      await initializeStakingService();

      console.log("Attempting to claim rewards...");
      console.log("Current stake info:", stakeInfo);

      const tx = await stakingService.claimRewards();
      setPendingTx(tx);

      // Performance: Invalidate cache
      performanceCache.invalidatePattern(`staking:${address}`);

      Alert.alert(
        "Claim Submitted",
        `Reward claim transaction submitted. Hash: ${tx.hash}`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("Claim rewards error:", error);
      Alert.alert("Claim Failed", error.message);
    } finally {
      setIsTransacting(false);
    }
  }, [stakeInfo, address]);

  const handleEmergencyWithdraw = useCallback(async () => {
    // Check if user has an active stake
    const stakedAmount = parseFloat(stakeInfo?.amount || "0");
    const hasActiveStake = stakeInfo?.active && stakedAmount > 0;

    if (!hasActiveStake) {
      Alert.alert(
        "No Active Stake",
        "You don't have any active stake to withdraw. Please stake some USDC first.",
        [{ text: "OK" }]
      );
      return;
    }

    // Show warning with estimated penalty if we have the info
    const penaltyPercent = stakingConfig?.emergencyWithdrawPenalty || 10; // Default 10%
    const penalty = (stakedAmount * penaltyPercent) / 100;

    Alert.alert(
      "Emergency Withdrawal Warning",
      `This will withdraw your stake with a ${penaltyPercent}% penalty.\n\nStaked Amount: ${stakedAmount.toFixed(
        6
      )} USDC\nEstimated Penalty: ${penalty.toFixed(
        6
      )} USDC\nYou'll receive: ~${(stakedAmount - penalty).toFixed(
        6
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
                [{ text: "OK" }]
              );
            } catch (error: any) {
              console.error("Emergency withdrawal error:", error);
              Alert.alert("Emergency Withdrawal Failed", error.message);
            } finally {
              setIsTransacting(false);
            }
          },
        },
      ]
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
        "Please fill in both title and description for your proposal."
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
                cleanDescription
              );

              setPendingTx(tx);

              Alert.alert(
                "Proposal Submitted!",
                `Your proposal has been submitted to the blockchain.\n\nTransaction Hash: ${tx.hash}\n\nIt will appear in the voting section once confirmed.`,
                [{ text: "OK" }]
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
                error.message || "Failed to create proposal"
              );
            } finally {
              setIsTransacting(false);
            }
          },
        },
      ]
    );
  }, [proposalTitle, proposalDescription, proposalCategory, address]);

  const handleVoteOnProposal = useCallback(async (proposalId: string, support: boolean) => {
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
        [{ text: "OK" }]
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
  }, [address]);

  // Handle Apply as Financier
  const handleApplyAsFinancier = useCallback(async () => {
    try {
      setIsApplyingFinancier(true);

      // Check if user has sufficient stake
      if (!stakeInfo || !stakeInfo.active) {
        Alert.alert(
          "No Active Stake",
          "You need to stake USDC first before applying as a financier.",
          [{ text: "OK" }]
        );
        return;
      }

      const minFinancierStake = parseFloat(
        stakingConfig?.minimumFinancierStake || "0"
      );
      const currentStake = parseFloat(stakeInfo.amount);

      if (currentStake < minFinancierStake) {
        Alert.alert(
          "Insufficient Stake",
          `You need at least ${minFinancierStake} USDC staked to become a financier.\n\nCurrent stake: ${currentStake} USDC`,
          [{ text: "OK" }]
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
                  [{ text: "OK" }]
                );

                // Reload stake info after a delay
                setTimeout(() => {
                  loadStakingData();
                }, 3000);
              } catch (error: any) {
                console.error("Apply as financier error:", error);
                Alert.alert(
                  "Application Failed",
                  error.message || "Failed to apply as financier"
                );
              } finally {
                setIsApplyingFinancier(false);
              }
            },
          },
        ]
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
    [stakeInfo?.amount]
  );

  const hasActiveStake = useMemo(
    () => stakeInfo?.active && stakedAmount > 0,
    [stakeInfo?.active, stakedAmount]
  );

  const pendingRewardsAmount = useMemo(
    () => parseFloat(stakeInfo?.pendingRewards || "0"),
    [stakeInfo?.pendingRewards]
  );

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Treasury Portal</Text>
          <Text style={styles.subtitle}>
            Stake, vote, and earn from treasury operations
          </Text>
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
              ) : selectedNetwork.chainId !== 4202 ? (
                <View style={styles.networkPrompt}>
                  <MaterialCommunityIcons
                    name="network"
                    size={48}
                    color={colors.warning}
                  />
                  <Text style={styles.networkPromptText}>
                    Please switch to Lisk Sepolia network
                  </Text>
                </View>
              ) : (
                <>
                  {/* Show skeleton loaders while loading */}
                  {isLoading ? (
                    <>
                      <SkeletonStatsGrid />
                      <View style={{ marginTop: spacing.lg }}>
                        <Skeleton width="40%" height={16} style={{ marginBottom: spacing.md }} />
                        <Skeleton width="100%" height={48} style={{ marginBottom: spacing.md }} />
                        <Skeleton width="100%" height={48} />
                      </View>
                    </>
                  ) : (
                    <>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Your Stake</Text>
                      <Text style={styles.statValue}>
                        {stakeInfo?.amount
                          ? parseFloat(stakeInfo.amount).toFixed(2)
                          : "0.00"}{" "}
                        USDC
                      </Text>
                      <Text style={styles.statSubtext}>
                        Balance: {parseFloat(usdcBalance).toFixed(2)} USDC
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Voting Power</Text>
                      <Text style={styles.statValue}>
                        {stakeInfo?.votingPower
                          ? parseFloat(stakeInfo.votingPower).toFixed(0)
                          : "0"}
                      </Text>
                      <Text style={styles.statSubtext}>
                        {stakeInfo?.isFinancier
                          ? "Financier"
                          : stakeInfo?.active
                          ? "Active"
                          : "Inactive"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.poolInfo}>
                    <View style={styles.poolStat}>
                      <Text style={styles.poolLabel}>Total Pool</Text>
                      <Text style={styles.poolValue}>
                        {poolStats
                          ? `${parseFloat(
                              poolStats.totalStaked
                            ).toLocaleString()} USDC`
                          : "Loading..."}
                      </Text>
                    </View>
                    <View style={styles.poolStat}>
                      <Text style={styles.poolLabel}>Current APR</Text>
                      <Text style={styles.poolValuePositive}>
                        {currentAPR.toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  {/* Stake Input Section */}
                  <View style={styles.stakeInputSection}>
                    <Text style={styles.inputLabel}>Stake Amount (USDC)</Text>
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
                          const maxStake = Math.max(
                            0,
                            parseFloat(usdcBalance) - 0.01
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
                          {stakingConfig?.minimumFinancierStake || "0"} USDC)
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
                              86400
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
                            Stake {stakeAsFinancier ? "as Financier" : "USDC"}
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
                            {Math.ceil(stakeInfo.timeUntilUnlock / 86400)} more
                            days
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
                                stakeInfo.timeUntilUnlock > 0
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
                                stakeInfo.timeUntilUnlock > 0
                            )
                          }
                        >
                          {isTransacting && pendingTx?.type === "unstake" ? (
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
                                  stakeInfo.timeUntilUnlock > 0
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
                          {isTransacting && pendingTx?.type === "emergency" ? (
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
                                parseFloat(stakeInfo?.amount || "0") <= 0) &&
                                styles.buttonTextDisabled,
                            ]}
                          >
                            {isTransacting && pendingTx?.type === "emergency"
                              ? "Processing..."
                              : "Emergency"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  </>
                  )}
                </>
              )}
            </View>

            {/* Earnings Section */}
            {isUnlocked && selectedNetwork.chainId === 4202 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Treasury Earnings</Text>
                  <TouchableOpacity
                    onPress={loadStakingData}
                    disabled={isLoading}
                  >
                    <MaterialCommunityIcons
                      name="refresh"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                
                {isLoading ? (
                  <SkeletonCard />
                ) : (
                <View style={styles.earningsCard}>
                  <View style={styles.earningsRow}>
                    <View style={styles.earningsItem}>
                      <Text style={styles.earningsLabel}>Pending Rewards</Text>
                      <Text style={styles.earningsValue}>
                        {stakeInfo?.pendingRewards
                          ? parseFloat(stakeInfo.pendingRewards).toFixed(4)
                          : "0.0000"}{" "}
                        USDC
                      </Text>
                    </View>
                    <View style={styles.earningsItem}>
                      <Text style={styles.earningsLabel}>Stake Duration</Text>
                      <Text style={styles.earningsValue}>
                        {stakeInfo?.timestamp
                          ? Math.floor(
                              (Date.now() / 1000 - stakeInfo.timestamp) / 86400
                            )
                          : "0"}{" "}
                        days
                      </Text>
                    </View>
                  </View>

                  {/* Pool Statistics */}
                  {poolStats && (
                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatItem}>
                        <Text style={styles.poolStatLabel}>Total Stakers</Text>
                        <Text style={styles.statValue}>
                          {poolStats.totalLiquidityProviders}
                        </Text>
                      </View>
                      <View style={styles.poolStatItem}>
                        <Text style={styles.poolStatLabel}>Pool Balance</Text>
                        <Text style={styles.statValue}>
                          {parseFloat(poolStats.contractBalance).toFixed(0)}{" "}
                          USDC
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.claimButton,
                      (!stakeInfo?.pendingRewards ||
                        parseFloat(stakeInfo.pendingRewards) <= 0 ||
                        isTransacting) &&
                        styles.claimButtonDisabled,
                    ]}
                    onPress={handleClaimRewards}
                    disabled={
                      !stakeInfo?.pendingRewards ||
                      parseFloat(stakeInfo.pendingRewards) <= 0 ||
                      isTransacting
                    }
                  >
                    {isTransacting ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.textSecondary}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="cash"
                        size={20}
                        color={
                          stakeInfo?.pendingRewards &&
                          parseFloat(stakeInfo.pendingRewards) > 0
                            ? "white"
                            : colors.textSecondary
                        }
                      />
                    )}
                    <Text
                      style={[
                        styles.claimButtonText,
                        (!stakeInfo?.pendingRewards ||
                          parseFloat(stakeInfo.pendingRewards) <= 0 ||
                          isTransacting) &&
                          styles.claimButtonTextDisabled,
                      ]}
                    >
                      {isTransacting ? "Processing..." : "Claim Rewards"}
                    </Text>
                  </TouchableOpacity>
                </View>
                )}
              </View>
            )}
          </>
        )}

        {activeTab === "create" && (
          <>
            {/* Financier Check for Create Proposal */}
            {!isEligibleFinancier ? (
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
                            stakingConfig?.minimumFinancierStake || "0"
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
            {!isEligibleFinancier ? (
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
                            stakingConfig?.minimumFinancierStake || "0"
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
            {!isEligibleFinancier ? (
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
                            stakingConfig?.minimumFinancierStake || "0"
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
  earningsCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsRow: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  earningsItem: {
    flex: 1,
    alignItems: "center",
  },
  earningsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  claimButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  claimButtonDisabled: {
    backgroundColor: colors.surface,
  },
  claimButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  claimButtonTextDisabled: {
    color: colors.textSecondary,
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
});

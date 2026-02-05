import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useWallet } from "./WalletContext";
import {
  treasuryEventService,
  TreasuryEvent,
} from "@/services/treasuryEventService";
import {
  stakingService,
  Proposal as StakingProposal,
} from "@/services/stakingService";
import { Storage } from "@/utils/storage";
import { backgroundDataLoader } from "@/services/backgroundDataLoader";

interface StakingData {
  stakedAmount: string;
  votingPower: string;
  rewards: string;
  apr: string;
  deadline: number;
  isFinancier: boolean;
}

interface FinancierStatus {
  isFinancier: boolean;
  revocationRequestTime: number | null;
  canCompleteRevocation: boolean;
}

type Proposal = StakingProposal;

interface TreasuryContextType {
  // Staking Data
  stakingData: StakingData | null;
  financierStatus: FinancierStatus | null;
  proposals: Proposal[];

  // Event-related
  recentEvents: TreasuryEvent[];
  eventSyncStatus: "idle" | "syncing" | "synced" | "error";
  lastSyncTime: number | null;

  // Actions
  refreshStakingData: () => Promise<void>;
  refreshProposals: () => Promise<void>;
  loadHistoricalEvents: () => Promise<void>;
  refreshAll: () => Promise<void>; // Pull-to-refresh handler

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean; // Pull-to-refresh state
  error: string | null;
}

const TreasuryContext = createContext<TreasuryContextType | undefined>(
  undefined,
);

export const TreasuryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { address, selectedNetwork } = useWallet();
  const chainId = selectedNetwork?.chainId;
  const currentNetwork = selectedNetwork;

  // State
  const [stakingData, setStakingData] = useState<StakingData | null>(null);
  const [financierStatus, setFinancierStatus] =
    useState<FinancierStatus | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [recentEvents, setRecentEvents] = useState<TreasuryEvent[]>([]);
  const [eventSyncStatus, setEventSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  // Prevent re-initialization on screen navigation
  const hasInitialized = useRef(false);
  const lastInitializedKey = useRef<string | null>(null);

  // Storage keys for data persistence
  const STAKING_STORAGE_KEY = `treasury_staking_${chainId}_${address}`;
  const FINANCIER_STORAGE_KEY = `treasury_financier_${chainId}_${address}`;
  const PROPOSALS_STORAGE_KEY = `treasury_proposals_${chainId}_${address}`;
  const EVENTS_STORAGE_KEY = `treasury_events_${chainId}_${address}`;
  const SYNC_TIME_KEY = `treasury_last_sync_${chainId}_${address}`;

  /**
   * Persist data to AsyncStorage (optimized for instant writes)
   * Uses fire-and-forget pattern for maximum speed
   */
  const persistData = useCallback(async () => {
    if (!address || !chainId) return;

    // Async writes to AsyncStorage
    await Storage.setJSON(STAKING_STORAGE_KEY, stakingData);
    await Storage.setJSON(FINANCIER_STORAGE_KEY, financierStatus);
    await Storage.setJSON(PROPOSALS_STORAGE_KEY, proposals);
    await Storage.setJSON(EVENTS_STORAGE_KEY, recentEvents.slice(0, 50));
    await Storage.setItem(SYNC_TIME_KEY, Date.now().toString());

    console.log("[TreasuryContext] ⚡ Data persisted to AsyncStorage");
  }, [
    address,
    chainId,
    stakingData,
    financierStatus,
    proposals,
    recentEvents,
    STAKING_STORAGE_KEY,
    FINANCIER_STORAGE_KEY,
    PROPOSALS_STORAGE_KEY,
    EVENTS_STORAGE_KEY,
    SYNC_TIME_KEY,
  ]);

  /**
   * Load cached data from AsyncStorage (INSTANT UI - < 50ms target)
   * Optimized for maximum speed with parallel parsing
   */
  const loadCachedData = useCallback(async () => {
    if (!address || !chainId) return;

    const startTime = performance.now();
    setIsLoadingFromCache(true);

    try {
      // Async reads from AsyncStorage
      const [staking, financier, props, events, lastSync] = await Promise.all([
        Storage.getJSON<StakingData>(STAKING_STORAGE_KEY),
        Storage.getJSON<FinancierStatus>(FINANCIER_STORAGE_KEY),
        Storage.getJSON<Proposal[]>(PROPOSALS_STORAGE_KEY),
        Storage.getJSON<TreasuryEvent[]>(EVENTS_STORAGE_KEY),
        Storage.getItem(SYNC_TIME_KEY),
      ]);

      if (staking) setStakingData(staking);
      if (financier) setFinancierStatus(financier);
      if (props) setProposals(props);
      if (events) setRecentEvents(events);

      const loadTime = performance.now() - startTime;
      console.log(
        `[TreasuryContext] ⚡ Cache loaded from AsyncStorage in ${loadTime.toFixed(2)}ms`,
      );

      if (lastSync) {
        const syncTime = parseInt(lastSync, 10);
        const timeSince = Math.floor((Date.now() - syncTime) / 1000);
        if (timeSince > 60) {
          console.log(
            `[TreasuryContext] ℹ️ Data is ${timeSince}s old, syncing...`,
          );
        }
      }
    } catch (error) {
      console.error("[TreasuryContext] ⚠️ Cache load failed:", error);
    } finally {
      setIsLoadingFromCache(false);
    }
  }, [
    address,
    chainId,
    STAKING_STORAGE_KEY,
    FINANCIER_STORAGE_KEY,
    PROPOSALS_STORAGE_KEY,
    EVENTS_STORAGE_KEY,
    SYNC_TIME_KEY,
  ]);

  /**
   * Load staking data from blockchain
   */
  const refreshStakingData = useCallback(async () => {
    if (!address || !currentNetwork) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await stakingService.getStakeInfo(address);
      const config = await stakingService.getStakingConfig();
      const aprValue =
        (config.currentRewardRate ?? 0) > 0
          ? config.currentRewardRate
          : (config.initialApr ?? 0);

      setStakingData({
        stakedAmount: data.amount || "0",
        votingPower: data.votingPower || "0",
        rewards: data.pendingRewards || "0",
        apr: String(aprValue ?? 0),
        deadline: data.deadline || 0,
        isFinancier: data.isFinancier || false,
      });

      // Also get financier status
      const isFinancier = await stakingService.isFinancier(address);
      const finStatus = await stakingService.getRevocationStatus(address);
      setFinancierStatus({
        isFinancier: isFinancier || false,
        revocationRequestTime: finStatus.revocationRequestTime || null,
        canCompleteRevocation: finStatus.canCompleteRevocation || false,
      });

      // Persist updated data to cache (fire-and-forget)
      persistData();
    } catch (err: any) {
      console.error("[TreasuryContext] Error loading staking data:", err);
      setError(err.message || "Failed to load staking data");
    } finally {
      setIsLoading(false);
    }
  }, [address, currentNetwork, persistData]);

  /**
   * Load governance proposals
   * Gracefully handles networks where governance isn't deployed
   */
  const refreshProposals = useCallback(async () => {
    if (!address || !currentNetwork) return;

    try {
      const proposalList = await stakingService.getAllProposals();
      setProposals(proposalList || []);

      // Persist updated data to cache (fire-and-forget)
      persistData();
    } catch (err: any) {
      // Governance not available on this network - this is OK
      const isGovernanceUnavailable =
        err.message?.includes("revert") ||
        err.message?.includes("Panic") ||
        err.code === "CALL_EXCEPTION";

      if (isGovernanceUnavailable) {
        console.log(
          "[TreasuryContext] ℹ️ Governance features not available on this network",
        );
        setProposals([]); // Clear proposals for networks without governance
      } else {
        console.error("[TreasuryContext] Error loading proposals:", err);
      }
    }
  }, [address, currentNetwork, persistData]);

  /**
   * Pull-to-refresh handler - fetches latest data from blockchain
   * Optimized for quick user feedback
   */
  const refreshAll = useCallback(async () => {
    if (!address || !currentNetwork) return;

    setIsRefreshing(true);
    console.log("[TreasuryContext] 🔄 Pull-to-refresh initiated");

    try {
      // Parallel fetch for speed
      await Promise.all([refreshStakingData(), refreshProposals()]);

      // Fetch only recent events (last 50 blocks for instant refresh)
      if (chainId) {
        const currentBlock =
          await treasuryEventService["provider"]?.getBlockNumber();
        if (currentBlock) {
          const recentEvents = await treasuryEventService.fetchPastEvents(
            address,
            currentBlock - 50,
            "latest",
            50,
          );

          if (recentEvents.length > 0) {
            setRecentEvents((prev) => {
              const combined = [...recentEvents, ...prev];
              const unique = Array.from(
                new Map(combined.map((e) => [e.transactionHash, e])).values(),
              );
              return unique.slice(0, 50);
            });
          }
        }
      }

      setLastSyncTime(Date.now());
      console.log("[TreasuryContext] ✅ Refresh complete");
    } catch (error) {
      console.error("[TreasuryContext] ⚠️ Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [address, currentNetwork, chainId, refreshStakingData, refreshProposals]);

  /**
   * Load historical events from blockchain
   */
  /**
   * Load historical events incrementally (PERSISTENT STORAGE STRATEGY)
   *
   * Strategy:
   * - Staking data, proposals, and events stored permanently in AsyncStorage
   * - Only fetch NEW events since last sync (incremental updates)
   * - First install: One-time full fetch, then incremental forever
   * - Completed proposals/stakes persist for historical reference
   * - Saves API quota, battery, and loading time
   */
  const loadHistoricalEvents = useCallback(async () => {
    if (!address || !chainId || !currentNetwork) return;

    try {
      setEventSyncStatus("syncing");
      const startTime = performance.now();

      // Get last synced block from Storage
      const storageKey = `treasury_last_block_${chainId}_${address}`;
      const lastBlockStr = await Storage.getItem(storageKey);
      const fromBlock = lastBlockStr ? parseInt(lastBlockStr, 10) + 1 : 0;

      // Get current block
      const currentBlock =
        await treasuryEventService["provider"]?.getBlockNumber();
      const blocksToSync = currentBlock ? currentBlock - fromBlock : 0;

      // Skip if already synced (no new blocks)
      if (blocksToSync === 0 && fromBlock > 0) {
        console.log("[TreasuryContext] ✅ Already synced - no new blocks");
        setEventSyncStatus("synced");
        return;
      }

      console.log(
        `[TreasuryContext] 🔄 Incremental sync: ${blocksToSync} new blocks (${fromBlock} → ${currentBlock})`,
      );

      // FIRST TIME SETUP: If never synced, do ONE-TIME full fetch
      if (fromBlock === 0) {
        console.log(
          "[TreasuryContext] 🚀 First time setup - doing one-time full fetch...",
        );
        await refreshStakingData();
        await refreshProposals();

        if (currentBlock) {
          await Storage.setItem(storageKey, currentBlock.toString());
        }

        await persistData();
        setEventSyncStatus("synced");
        setLastSyncTime(Date.now());
        return;
      }

      // INCREMENTAL UPDATES: Only fetch events for new blocks (very fast)
      const maxBlockRange = 200; // Sync up to 200 new blocks

      const events = await treasuryEventService.fetchPastEvents(
        address,
        fromBlock,
        "latest",
        maxBlockRange,
      );

      console.log(
        `[TreasuryContext] ✅ Fetched ${events.length} new events in ${(performance.now() - startTime).toFixed(0)}ms`,
      );

      // EVENT-DRIVEN UPDATES: Apply changes based on event types
      if (events.length > 0) {
        // Add new events to recent events (keep last 50)
        setRecentEvents((prev) => {
          const combined = [...prev, ...events];
          const sorted = combined.sort((a, b) => b.blockNumber - a.blockNumber);
          return sorted.slice(0, 50);
        });

        // Determine what needs refreshing based on event types
        const hasStakingEvents = events.some((e) =>
          [
            "Staked",
            "Unstaked",
            "RewardsClaimed",
            "EmergencyWithdrawn",
            "CustomDeadlineSet",
            "FinancierStatusChanged",
            "FinancierRevocationRequested",
            "FinancierRevocationCompleted",
            "FinancierRevocationCancelled",
          ].includes(e.eventType),
        );

        const hasProposalEvents = events.some((e) =>
          [
            "ProposalCreated",
            "ProposalVoteCast",
            "ProposalStatusChanged",
            "ProposalExecuted",
          ].includes(e.eventType),
        );

        console.log(
          `[TreasuryContext] 📝 Updating affected data (staking: ${hasStakingEvents}, proposals: ${hasProposalEvents})`,
        );

        // Refresh only affected data
        const updatePromises: Promise<void>[] = [];
        if (hasStakingEvents) updatePromises.push(refreshStakingData());
        if (hasProposalEvents) updatePromises.push(refreshProposals());

        await Promise.all(updatePromises);

        // Save last processed block
        const lastBlock = Math.max(...events.map((e) => e.blockNumber));
        await Storage.setItem(storageKey, lastBlock.toString());
      }

      // PERSIST TO STORAGE: Save all data for offline access and fast next load
      await persistData();

      setEventSyncStatus("synced");
      setLastSyncTime(Date.now());

      const totalTime = performance.now() - startTime;
      console.log(
        `[TreasuryContext] ⚡ Incremental sync complete in ${totalTime.toFixed(0)}ms - Data persists forever`,
      );
    } catch (err: any) {
      console.error("[TreasuryContext] Error loading historical events:", err);
      setEventSyncStatus("error");
    }
  }, [
    address,
    chainId,
    currentNetwork,
    refreshStakingData,
    refreshProposals,
    persistData,
  ]);

  /**
   * Handle real-time events (microsecond-level updates)
   * Optimized for instant UI updates with optimistic persistence
   */
  const handleRealtimeEvent = useCallback(
    async (event: TreasuryEvent) => {
      const eventTime = performance.now();
      console.log(`[TreasuryContext] ⚡ Real-time: ${event.eventType}`);

      // Instant UI update - add to recent events immediately
      setRecentEvents((prev) => {
        const newEvents = [event, ...prev].slice(0, 50);
        return newEvents;
      });

      // Mark as pending update
      const updateId = `${event.eventType}_${event.blockNumber}`;
      setPendingUpdates((prev) => new Set(prev).add(updateId));

      // Optimistic persistence (fire-and-forget)
      persistData();

      // Update relevant data based on event type (parallel where possible)
      const updatePromises: Promise<void>[] = [];

      switch (event.eventType) {
        case "Staked":
        case "Unstaked":
        case "RewardsClaimed":
        case "EmergencyWithdrawn":
        case "CustomDeadlineSet":
        case "FinancierStatusChanged":
        case "FinancierRevocationRequested":
        case "FinancierRevocationCompleted":
        case "FinancierRevocationCancelled":
          updatePromises.push(refreshStakingData());
          break;

        case "ProposalCreated":
        case "ProposalVoteCast":
        case "ProposalStatusChanged":
        case "ProposalExecuted":
          updatePromises.push(refreshProposals());
          break;
      }

      // Execute updates in parallel
      await Promise.all(updatePromises);

      // Save last processed block (instant)
      if (address && chainId) {
        const storageKey = `treasury_last_block_${chainId}_${address}`;
        await Storage.setItem(storageKey, event.blockNumber.toString());
      }

      // Clear pending update
      setPendingUpdates((prev) => {
        const next = new Set(prev);
        next.delete(updateId);
        return next;
      });

      const updateDuration = performance.now() - eventTime;
      console.log(
        `[TreasuryContext] ⚡ Event processed in ${updateDuration.toFixed(2)}ms`,
      );
    },
    [address, chainId, refreshStakingData, refreshProposals, persistData],
  );

  /**
   * Initialize: Load cache FIRST (instant), then sync events in background
   * Only re-initializes when address/chainId changes, NOT on screen navigation
   */
  useEffect(() => {
    if (!address || !chainId || !currentNetwork) {
      treasuryEventService.stopListening();
      hasInitialized.current = false;
      lastInitializedKey.current = null;
      return;
    }

    // Create unique key for this wallet + network combination
    const initKey = `${address}_${chainId}`;

    // Skip if already initialized for this wallet/network
    if (hasInitialized.current && lastInitializedKey.current === initKey) {
      console.log(
        "[TreasuryContext] 🚀 Already initialized - using cached data",
      );
      return;
    }

    const initialize = async () => {
      console.log(
        "[TreasuryContext] ⚡ INSTANT LOAD - Using background preloaded data...",
      );
      const startTime = performance.now();

      // Initialize event service
      treasuryEventService.setNetwork(chainId, currentNetwork);

      try {
        // 1. Load background preloaded data (INSTANT - already fetched during unlock screen)
        const cachedData = await backgroundDataLoader.getCachedTreasuryData();

        if (cachedData.pools.length > 0 || cachedData.position) {
          console.log(`[TreasuryContext] 📦 Found preloaded treasury data`);

          // Use preloaded position data if available
          if (cachedData.position) {
            setStakingData(cachedData.position.stakingData || null);
            setFinancierStatus(cachedData.position.financierStatus || null);
          }

          const loadTime = performance.now() - startTime;
          console.log(
            `[TreasuryContext] ✅ INSTANT load in ${loadTime.toFixed(0)}ms (preloaded data)`,
          );
        } else {
          // Fallback to legacy cached data if background preload missed
          console.log(
            "[TreasuryContext] 📊 No preloaded data - using legacy cache",
          );
          await loadCachedData();
        }

        // 2. Start real-time listeners immediately (no need to wait for sync)
        treasuryEventService.startListening(address, handleRealtimeEvent);

        // 3. Load historical events in background (non-blocking, runs after UI is shown)
        loadHistoricalEvents().catch((err) => {
          console.warn("[TreasuryContext] Background sync error:", err);
        });

        hasInitialized.current = true;
        lastInitializedKey.current = initKey;

        const totalTime = performance.now() - startTime;
        console.log(
          `[TreasuryContext] ✅ Context ready in ${totalTime.toFixed(0)}ms`,
        );
      } catch (error) {
        console.error("[TreasuryContext] Initialization error:", error);
        // Fallback to full data fetch
        await loadCachedData();
        await loadHistoricalEvents();
      }
    };

    initialize();

    return () => {
      treasuryEventService.stopListening();
    };
  }, [
    address,
    chainId,
    currentNetwork,
    loadCachedData,
    loadHistoricalEvents,
    handleRealtimeEvent,
  ]);

  const value: TreasuryContextType = {
    stakingData,
    financierStatus,
    proposals,
    recentEvents,
    eventSyncStatus,
    lastSyncTime,
    refreshStakingData,
    refreshProposals,
    loadHistoricalEvents,
    refreshAll,
    isLoading,
    isRefreshing,
    error,
  };

  return (
    <TreasuryContext.Provider value={value}>
      {children}
    </TreasuryContext.Provider>
  );
};

export const useTreasury = (): TreasuryContextType => {
  const context = useContext(TreasuryContext);
  if (!context) {
    throw new Error("useTreasury must be used within TreasuryProvider");
  }
  return context;
};

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  tradeFinanceService,
  PGAInfo,
  PGAStatus,
} from "@/services/tradeFinanceService";
import {
  tradeFinanceEventService,
  PGAEvent,
} from "@/services/tradeFinanceEventService";
import { useWallet } from "./WalletContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

type TradeFinanceCache = {
  applications: Application[];
  drafts: DraftCertificate[];
  lastSyncTime?: number;
  lastUpdated: number;
};

const tradeFinanceMemoryCache = new Map<string, TradeFinanceCache>();

// Storage keys for data persistence
const STORAGE_KEYS = {
  APPLICATIONS: "trade_finance_applications",
  DRAFT_CERTIFICATES: "trade_finance_draft_certificates",
  PGAS: "trade_finance_pgas",
  RECENT_EVENTS: "trade_finance_recent_events",
  LAST_SYNC_TIME: "trade_finance_last_sync_time",
};

interface Application {
  id: string;
  requestId: string;
  companyName: string;
  guaranteeAmount: string;
  tradeValue: string;
  status:
    | "Draft Sent to Pool"
    | "Draft Sent to Seller"
    | "Seller Approved"
    | "Fee Paid"
    | "Awaiting Certificate"
    | "Invoice Settled"
    | "Certificate Issued"
    | "Goods Shipped"
    | "Delivery Confirmed"
    | "Transaction Complete"
    | "Pending Draft"
    | "Approved"
    | "Awaiting Fee Payment"
    | "Processing";
  submittedDate: string;
  contractNumber: string;
  tradeDescription: string;
  buyer: {
    company: string;
    registration: string;
    country: string;
    contact: string;
    email: string;
    phone: string;
    walletAddress: string;
    applicationDate: string;
  };
  seller: {
    walletAddress: string;
  };
  proformaInvoiceIpfs?: { hash: string; url: string };
  salesContractIpfs?: { hash: string; url: string };
  documents?: string[];
  applicationDate: string;
  paymentDueDate: string;
  financingDuration: number;
  issuanceFee: string;
  collateralDescription: string;
  collateralValue: string;

  // Stage 5: Certificate Details
  certificateIssuedDate?: string;
  certificateContent?: string;

  // Stage 6: Shipping Details
  proofOfShipment?: {
    trackingNumber?: string;
    carrier?: string;
    shippingDate?: string;
    documents?: Array<{
      name: string;
      uri: string;
      type: string;
    }>;
  };

  // Stage 7: Delivery Details
  deliveryConfirmedDate?: string;
  deliveryConfirmedBy?: "buyer" | "seller";

  // Stage 8: Transaction Summary
  transactionCompletedDate?: string;
  finalAmount?: string;

  // Progress and Persistence
  currentStage: number; // 1-8
  isDraft: boolean;
  lastUpdated: string;

  // Blockchain specific
  certificateIssuedAt?: number;
  deliveryAgreementId?: string;
}

interface DraftCertificate {
  id: string;
  requestId: string;
  guaranteeNo: string;
  applicant: {
    company: string;
    registration: string;
    country: string;
    contact: string;
    email: string;
    phone: string;
    walletAddress: string;
    applicationDate: string;
  };
  beneficiary: {
    walletAddress: string;
  };
  tradeDescription: string;
  collateralDescription: string;
  guaranteeAmount: string;
  collateralValue: string;
  financingDuration: number;
  contractNumber: string;
  contractDate: string;
  paymentDueDate: string;
  status:
    | "SENT TO SELLER"
    | "AWAITING FEE PAYMENT"
    | "AWAITING CERTIFICATE"
    | "INVOICE SETTLED"
    | "CERTIFICATE_ISSUED"
    | "PENDING DRAFT";
  issuanceFee: string;
  content: string;

  // Certificate voting and issuance
  stakersVotes?: Array<{
    stakerId: string;
    vote: "approve" | "reject";
    timestamp: string;
  }>;
  voteDeadline?: string;
  requiredVotes?: number;
  currentVotes?: { approve: number; reject: number };
}

interface TradeFinanceContextType {
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  drafts: DraftCertificate[];
  setDrafts: React.Dispatch<React.SetStateAction<DraftCertificate[]>>;
  addApplication: (application: Application) => void;
  addDraft: (draft: DraftCertificate) => void;
  updateApplicationStatus: (id: string, status: Application["status"]) => void;
  updateDraftStatus: (id: string, status: DraftCertificate["status"]) => void;

  // Stage 5: Certificate issuance
  issueCertificate: (applicationId: string, certificateContent: string) => void;

  // Stage 6: Shipping confirmation
  updateShippingDetails: (
    applicationId: string,
    shippingDetails: Application["proofOfShipment"],
  ) => void;

  // Stage 7: Delivery confirmation
  confirmDelivery: (
    applicationId: string,
    confirmedBy: "buyer" | "seller",
  ) => void;

  // Stage 8: Complete transaction
  completeTransaction: (applicationId: string, finalAmount: string) => void;

  // Progress and persistence
  updateApplicationStage: (id: string, stage: number) => void;
  saveDraft: (application: Application) => void;

  // Blockchain Sync
  fetchBlockchainData: () => Promise<void>;
  refreshAll: () => Promise<void>; // Pull-to-refresh handler
  isRefreshing: boolean; // Pull-to-refresh loading state
  createPGABlockchain: (params: any) => Promise<void>;
  votePGABlockchain: (pgaId: string, support: boolean) => Promise<void>;
  sellerVotePGABlockchain: (pgaId: string, approve: boolean) => Promise<void>;
  payCollateralBlockchain: (pgaId: string, amount: string) => Promise<void>;
  confirmGoodsShippedBlockchain: (
    pgaId: string,
    logisticPartnerName: string,
  ) => Promise<void>;
  payBalancePaymentBlockchain: (pgaId: string, amount: string) => Promise<void>;
  issueCertificateBlockchain: (pgaId: string) => Promise<void>;
  createDeliveryAgreementBlockchain: (params: any) => Promise<void>;
  buyerConsentToDeliveryBlockchain: (
    agreementId: string,
    consent: boolean,
  ) => Promise<void>;
  releasePaymentToSellerBlockchain: (pgaId: string) => Promise<void>;
}

const TradeFinanceContext = createContext<TradeFinanceContextType | undefined>(
  undefined,
);

export const TradeFinanceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [drafts, setDrafts] = useState<DraftCertificate[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncedBlock, setLastSyncedBlock] = useState<number>(0);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState<boolean>(true);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  // Prevent re-initialization on screen navigation
  const hasInitialized = useRef(false);
  const lastInitializedKey = useRef<string | null>(null);
  const hasLoadedCache = useRef(false);

  const addApplication = (application: Application) => {
    setApplications((prev) => [application, ...prev]);
  };

  const addDraft = (draft: DraftCertificate) => {
    setDrafts((prev) => [draft, ...prev]);
  };

  const updateApplicationStatus = (
    id: string,
    status: Application["status"],
  ) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status } : app)),
    );
  };

  const updateDraftStatus = (
    id: string,
    status: DraftCertificate["status"],
  ) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, status } : draft)),
    );
  };

  // Stage 5: Certificate issuance
  const issueCertificate = (
    applicationId: string,
    certificateContent: string,
  ) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              status: "Certificate Issued",
              currentStage: 5,
              certificateIssuedDate: new Date().toLocaleDateString("en-US"),
              certificateContent,
              lastUpdated: new Date().toISOString(),
            }
          : app,
      ),
    );

    // Update corresponding draft
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.requestId === applicationId
          ? { ...draft, status: "CERTIFICATE_ISSUED" }
          : draft,
      ),
    );
  };

  // Stage 6: Shipping confirmation
  const updateShippingDetails = (
    applicationId: string,
    shippingDetails: Application["proofOfShipment"],
  ) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              status: "Goods Shipped",
              currentStage: 6,
              proofOfShipment: shippingDetails,
              lastUpdated: new Date().toISOString(),
            }
          : app,
      ),
    );
  };

  // Stage 7: Delivery confirmation
  const confirmDelivery = (
    applicationId: string,
    confirmedBy: "buyer" | "seller",
  ) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              status: "Delivery Confirmed",
              currentStage: 7,
              deliveryConfirmedDate: new Date().toLocaleDateString("en-US"),
              deliveryConfirmedBy: confirmedBy,
              lastUpdated: new Date().toISOString(),
            }
          : app,
      ),
    );
  };

  // Stage 8: Complete transaction
  const completeTransaction = (applicationId: string, finalAmount: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? {
              ...app,
              status: "Transaction Complete",
              currentStage: 8,
              transactionCompletedDate: new Date().toLocaleDateString("en-US"),
              finalAmount,
              isDraft: false,
              lastUpdated: new Date().toISOString(),
            }
          : app,
      ),
    );
  };

  // Progress and persistence
  const updateApplicationStage = (id: string, stage: number) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              currentStage: stage,
              lastUpdated: new Date().toISOString(),
            }
          : app,
      ),
    );
  };

  const saveDraft = (application: Application) => {
    setApplications((prev) => {
      const existing = prev.find((app) => app.id === application.id);
      if (existing) {
        return prev.map((app) =>
          app.id === application.id
            ? {
                ...application,
                isDraft: true,
                lastUpdated: new Date().toISOString(),
              }
            : app,
        );
      } else {
        return [
          {
            ...application,
            isDraft: true,
            lastUpdated: new Date().toISOString(),
          },
          ...prev,
        ];
      }
    });
  };

  const { selectedNetwork, address, isUnlocked } = useWallet();

  // Storage keys for data persistence
  const STORAGE_KEY = `trade_finance_last_block_${selectedNetwork?.chainId}_${address}`;
  const APPS_STORAGE_KEY = `trade_finance_apps_${selectedNetwork?.chainId}_${address}`;
  const DRAFTS_STORAGE_KEY = `trade_finance_drafts_${selectedNetwork?.chainId}_${address}`;
  const SYNC_TIME_KEY = `trade_finance_last_sync_${selectedNetwork?.chainId}_${address}`;

  /**
   * Persist data to AsyncStorage (fire-and-forget for instant performance)
   */
  const persistData = useCallback(() => {
    if (!selectedNetwork || !address) return;

    const memoryKey = `${selectedNetwork.chainId}_${address}`;
    tradeFinanceMemoryCache.set(memoryKey, {
      applications,
      drafts,
      lastSyncTime: Date.now(),
      lastUpdated: Date.now(),
    });

    // Fire-and-forget - instant return
    Promise.all([
      AsyncStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(applications)),
      AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts)),
      AsyncStorage.setItem(SYNC_TIME_KEY, Date.now().toString()),
    ]).catch((error) => {
      console.error("[TradeFinanceContext] ⚠️ Persist failed:", error);
    });
  }, [
    selectedNetwork?.chainId,
    address,
    applications,
    drafts,
    APPS_STORAGE_KEY,
    DRAFTS_STORAGE_KEY,
    SYNC_TIME_KEY,
  ]);

  /**
   * Load cached data from AsyncStorage (< 50ms target for instant UI)
   */
  const loadCachedData = useCallback(async (): Promise<boolean> => {
    if (!selectedNetwork || !address) return;

    const startTime = performance.now();
    setIsLoadingFromCache(true);

    try {
      const memoryKey = `${selectedNetwork.chainId}_${address}`;
      const memoryCache = tradeFinanceMemoryCache.get(memoryKey);
      if (memoryCache) {
        setApplications(memoryCache.applications);
        setDrafts(memoryCache.drafts);
        hasLoadedCache.current = true;
        const loadTime = performance.now() - startTime;
        console.log(
          `[TradeFinanceContext] ⚡ Memory cache loaded in ${loadTime.toFixed(2)}ms`,
        );
        return true;
      }

      const [cachedApps, cachedDrafts, lastSync] = await Promise.all([
        AsyncStorage.getItem(APPS_STORAGE_KEY),
        AsyncStorage.getItem(DRAFTS_STORAGE_KEY),
        AsyncStorage.getItem(SYNC_TIME_KEY),
      ]);

      // Batch state updates
      if (cachedApps) {
        setApplications(JSON.parse(cachedApps));
      }
      if (cachedDrafts) {
        setDrafts(JSON.parse(cachedDrafts));
      }

      hasLoadedCache.current = Boolean(cachedApps || cachedDrafts);

      const loadTime = performance.now() - startTime;
      console.log(
        `[TradeFinanceContext] ⚡ Cache loaded in ${loadTime.toFixed(2)}ms`,
      );

      if (lastSync) {
        const timeSince = Math.floor(
          (Date.now() - parseInt(lastSync, 10)) / 1000,
        );
        if (timeSince > 60) {
          console.log(`[TradeFinanceContext] ℹ️ Data is ${timeSince}s old`);
        }
      }
      return Boolean(cachedApps || cachedDrafts || lastSync);
    } catch (error) {
      console.error("[TradeFinanceContext] ⚠️ Cache load failed:", error);
      return false;
    } finally {
      setIsLoadingFromCache(false);
    }
  }, [
    selectedNetwork?.chainId,
    address,
    APPS_STORAGE_KEY,
    DRAFTS_STORAGE_KEY,
    SYNC_TIME_KEY,
  ]);

  // Load last synced block from storage
  useEffect(() => {
    const loadLastSyncedBlock = async () => {
      if (selectedNetwork && address) {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            setLastSyncedBlock(parseInt(stored, 10));
          }
        } catch (error) {
          console.error("Error loading last synced block:", error);
        }
      }
    };
    loadLastSyncedBlock();
  }, [selectedNetwork?.chainId, address]);

  // Save last synced block to storage
  const saveLastSyncedBlock = async (blockNumber: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, blockNumber.toString());
      setLastSyncedBlock(blockNumber);
    } catch (error) {
      console.error("Error saving last synced block:", error);
    }
  };

  // Sync network with service
  useEffect(() => {
    if (selectedNetwork) {
      tradeFinanceService.setNetwork(selectedNetwork.chainId, selectedNetwork);
      tradeFinanceEventService.setNetwork(
        selectedNetwork.chainId,
        selectedNetwork,
      );
    }
  }, [selectedNetwork]);

  const mapPGAStatusToAppStatus = (
    status: PGAStatus,
  ): Application["status"] => {
    switch (status) {
      case PGAStatus.Created:
        return "Draft Sent to Pool";
      case PGAStatus.GuaranteeApproved:
        return "Draft Sent to Seller";
      case PGAStatus.SellerApproved:
        return "Seller Approved";
      case PGAStatus.CollateralPaid:
        return "Fee Paid";
      case PGAStatus.GoodsShipped:
        return "Goods Shipped";
      case PGAStatus.BalancePaymentPaid:
        return "Invoice Settled";
      case PGAStatus.CertificateIssued:
        return "Certificate Issued";
      case PGAStatus.DeliveryAwaitingConsent:
        return "Awaiting Certificate";
      case PGAStatus.Completed:
        return "Transaction Complete";
      case PGAStatus.Rejected:
        return "Pending Draft";
      case PGAStatus.Expired:
        return "Pending Draft";
      case PGAStatus.Disputed:
        return "Processing";
      default:
        return "Pending Draft";
    }
  };

  const mapPGAStatusToStage = (status: PGAStatus): number => {
    switch (status) {
      case PGAStatus.Created:
        return 2; // Pool Review
      case PGAStatus.GuaranteeApproved:
        return 3; // Seller Review
      case PGAStatus.SellerApproved:
        return 4; // Seller Approved
      case PGAStatus.CollateralPaid:
        return 4; // Fee Paid
      case PGAStatus.CertificateIssued:
        return 5;
      case PGAStatus.GoodsShipped:
        return 6;
      case PGAStatus.DeliveryAwaitingConsent:
        return 7;
      case PGAStatus.BalancePaymentPaid:
        return 8;
      case PGAStatus.Completed:
        return 9;
      case PGAStatus.Rejected:
        return 1;
      case PGAStatus.Expired:
        return 1;
      case PGAStatus.Disputed:
        return 7;
      default:
        return 1;
    }
  };

  const mapPGAInfoToApplication = (pga: PGAInfo): Application => {
    const symbol = selectedNetwork?.stablecoins?.[0]?.symbol || "USDC";
    return {
      id: pga.id,
      requestId: pga.id,
      companyName: pga.companyName,
      guaranteeAmount: `${pga.guaranteeAmount} ${symbol}`,
      tradeValue: `${pga.tradeValue} ${symbol}`,
      status: mapPGAStatusToAppStatus(pga.status),
      submittedDate: new Date(pga.createdAt * 1000).toLocaleDateString(),
      contractNumber: pga.contractNumber || "",
      tradeDescription: pga.tradeDescription,
      buyer: {
        company: pga.companyName,
        registration: pga.registrationNumber || "",
        country: "",
        contact: pga.beneficiaryName || "",
        email: "",
        phone: "",
        walletAddress: pga.beneficiaryWallet || "",
        applicationDate: new Date(pga.createdAt * 1000).toLocaleDateString(),
      },
      seller: {
        walletAddress: pga.seller || "",
      },
      applicationDate: new Date(pga.createdAt * 1000).toISOString(),
      paymentDueDate: new Date(pga.votingDeadline * 1000).toLocaleDateString(),
      financingDuration: pga.duration,
      issuanceFee: `${(parseFloat(pga.guaranteeAmount) * 0.1).toFixed(2)} ${symbol}`,
      collateralDescription: "",
      collateralValue: `${pga.collateralAmount} ${symbol}`,
      currentStage: mapPGAStatusToStage(pga.status),
      isDraft: false,
      lastUpdated: new Date().toISOString(),
      certificateIssuedAt: pga.certificateIssuedAt,
      deliveryAgreementId: pga.deliveryAgreementId,
    };
  };

  const fetchBlockchainData = useCallback(async () => {
    if (!address || !isUnlocked) return;
    try {
      const buyerPGAs = await tradeFinanceService.getAllPGAsByBuyer(address);
      const sellerPGAs = await tradeFinanceService.getAllPGAsBySeller(address);

      const allApps = [...buyerPGAs, ...sellerPGAs].map(
        mapPGAInfoToApplication,
      );
      setApplications(allApps);
    } catch (error) {
      console.error("Error fetching blockchain data:", error);
    }
  }, [address, isUnlocked]);

  /**
   * Handle real-time events from the blockchain
   */
  /**
   * Real-time event handler - optimized for microsecond-level updates
   * Uses fire-and-forget persistence and optimistic UI updates
   */
  const handleRealtimeEvent = useCallback(
    async (event: PGAEvent) => {
      const startTime = performance.now();
      console.log(
        `[TradeFinanceContext] ⚡ Real-time: ${event.eventType} (PGA: ${event.pgaId})`,
      );

      try {
        // Prevent duplicate processing
        const eventKey = `${event.pgaId}-${event.blockNumber}`;
        if (pendingUpdates.has(eventKey)) {
          console.log("[TradeFinanceContext] ⏭️ Skipping duplicate event");
          return;
        }
        pendingUpdates.add(eventKey);

        // Fetch updated PGA data
        const pgaInfo = await tradeFinanceService.getPGA(event.pgaId);
        const updatedApp = mapPGAInfoToApplication(pgaInfo);

        // INSTANT UI update (optimistic)
        setApplications((prev) => {
          const existingIndex = prev.findIndex((app) => app.id === event.pgaId);

          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = updatedApp;
            return updated;
          } else {
            return [updatedApp, ...prev];
          }
        });

        // Fire-and-forget persistence (no await - instant return)
        persistData();

        // Save latest block (fire-and-forget)
        if (event.blockNumber > lastSyncedBlock) {
          saveLastSyncedBlock(event.blockNumber).catch(() => {});
        }

        // Clean up pending flag after a delay
        setTimeout(() => pendingUpdates.delete(eventKey), 5000);

        const updateTime = performance.now() - startTime;
        console.log(
          `[TradeFinanceContext] ✅ Real-time update: ${updateTime.toFixed(2)}ms`,
        );
      } catch (error) {
        console.error(
          `[TradeFinanceContext] ⚠️ Event error (PGA ${event.pgaId}):`,
          error,
        );
      }
    },
    [lastSyncedBlock, persistData, pendingUpdates],
  );

  /**
   * Load historical events on initial mount
   */
  const loadHistoricalEvents = useCallback(async () => {
    if (!address || !isUnlocked || isLoadingHistory) return;

    setIsLoadingHistory(true);
    console.log("[TradeFinanceContext] Loading historical events...");

    try {
      // Fetch past events from last synced block (or genesis if first time)
      const fromBlock = lastSyncedBlock > 0 ? lastSyncedBlock + 1 : 0;
      // Limit to 500 blocks on initial load (faster for free tier, ~1-2 days of blocks on Sepolia)
      const pastEvents = await tradeFinanceEventService.fetchPastEvents(
        address,
        fromBlock,
        "latest",
        500,
      );

      console.log(
        `[TradeFinanceContext] Loaded ${pastEvents.length} historical events`,
      );

      // Process events to build application state
      const pgaIds = new Set<string>();
      pastEvents.forEach((event) => pgaIds.add(event.pgaId));

      // Fetch current state for all PGAs mentioned in events
      const pgaPromises = Array.from(pgaIds).map((pgaId) =>
        tradeFinanceService.getPGA(pgaId).catch((err) => {
          console.warn(`Failed to fetch PGA ${pgaId}:`, err);
          return null;
        }),
      );

      const pgaInfos = (await Promise.all(pgaPromises)).filter(
        (p) => p !== null,
      ) as PGAInfo[];
      const apps = pgaInfos.map(mapPGAInfoToApplication);

      setApplications(apps);

      // Persist updated data to cache (fire-and-forget)
      persistData();

      // Save the latest block processed
      const latestBlock = tradeFinanceEventService.getLastProcessedBlock();
      if (latestBlock > lastSyncedBlock) {
        await saveLastSyncedBlock(latestBlock);
      }

      console.log(
        "[TradeFinanceContext] Historical events loaded successfully",
      );
    } catch (error) {
      console.error(
        "[TradeFinanceContext] Error loading historical events:",
        error,
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, [address, isUnlocked, lastSyncedBlock, isLoadingHistory, persistData]);

  /**
   * Pull-to-refresh handler - fetches latest blockchain data
   * Optimized for quick user feedback with recent events only
   */
  const refreshAll = useCallback(async () => {
    if (!address || !isUnlocked || !selectedNetwork) return;

    setIsRefreshing(true);
    console.log("[TradeFinanceContext] 🔄 Pull-to-refresh initiated");

    try {
      // Fetch only recent events (last 50 blocks for instant refresh)
      const currentBlock =
        await tradeFinanceEventService["provider"]?.getBlockNumber();
      if (currentBlock) {
        const recentEvents = await tradeFinanceEventService.fetchPastEvents(
          address,
          currentBlock - 50,
          "latest",
          50,
        );

        if (recentEvents.length > 0) {
          console.log(
            `[TradeFinanceContext] Found ${recentEvents.length} recent events`,
          );

          // Get unique PGA IDs from recent events
          const pgaIds = new Set<string>();
          recentEvents.forEach((event) => pgaIds.add(event.pgaId));

          // Fetch current state for these PGAs
          const pgaPromises = Array.from(pgaIds).map((pgaId) =>
            tradeFinanceService.getPGA(pgaId).catch(() => null),
          );

          const pgaInfos = (await Promise.all(pgaPromises)).filter(
            (p) => p !== null,
          ) as PGAInfo[];
          const updatedApps = pgaInfos.map(mapPGAInfoToApplication);

          // Merge with existing applications
          setApplications((prev) => {
            const existingMap = new Map(prev.map((app) => [app.id, app]));
            updatedApps.forEach((app) => existingMap.set(app.id, app));
            return Array.from(existingMap.values());
          });

          // Save last processed block
          await saveLastSyncedBlock(currentBlock);
        }
      }

      console.log("[TradeFinanceContext] ✅ Refresh complete");
    } catch (error) {
      console.error("[TradeFinanceContext] ⚠️ Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [address, isUnlocked, selectedNetwork]);

  /**
   * Initialize: Load cache FIRST (instant), then sync events in background
   * Only re-initializes when address/network changes, NOT on screen navigation
   */
  useEffect(() => {
    if (!address || !isUnlocked || !selectedNetwork) {
      tradeFinanceEventService.stopListening();
      hasInitialized.current = false;
      lastInitializedKey.current = null;
      return;
    }

    // Create unique key for this wallet + network combination
    const initKey = `${address}_${selectedNetwork.chainId}`;

    // Skip if already initialized for this wallet/network
    if (hasInitialized.current && lastInitializedKey.current === initKey) {
      console.log(
        "[TradeFinanceContext] 🚀 Already initialized - using cached data",
      );
      return;
    }

    const initialize = async () => {
      console.log(
        "[TradeFinanceContext] Initializing with cache-first strategy...",
      );

      // 1. Load cached data immediately (INSTANT UI - < 100ms)
      await loadCachedData();

      // 2. Load historical events in background (sync)
      await loadHistoricalEvents();

      // 3. Start listening for real-time events
      tradeFinanceEventService.startListening(address, handleRealtimeEvent);

      hasInitialized.current = true;
      lastInitializedKey.current = initKey;
      console.log(
        "[TradeFinanceContext] ✅ Initialization complete (cache + sync)",
      );
    };

    initialize();

    // Cleanup on unmount (but don't reset hasInitialized - only reset on wallet/network change)
    return () => {
      tradeFinanceEventService.stopListening();
    };
  }, [
    address,
    isUnlocked,
    selectedNetwork,
    loadCachedData,
    loadHistoricalEvents,
    handleRealtimeEvent,
  ]);

  const createPGABlockchain = async (params: any) => {
    await tradeFinanceService.createPGA(params);
    // Event listener will automatically pick up the PGACreated event
    // But we can also manually refresh as a fallback
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  const votePGABlockchain = async (pgaId: string, support: boolean) => {
    await tradeFinanceService.voteOnPGA(pgaId, support);
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  const sellerVotePGABlockchain = async (pgaId: string, approve: boolean) => {
    await tradeFinanceService.sellerVoteOnPGA(pgaId, approve);
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  const payCollateralBlockchain = async (pgaId: string, amount: string) => {
    await tradeFinanceService.payCollateral(pgaId, amount);
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  const confirmGoodsShippedBlockchain = async (
    pgaId: string,
    logisticPartnerName: string,
  ) => {
    await tradeFinanceService.confirmGoodsShipped(pgaId, logisticPartnerName);
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  const payBalancePaymentBlockchain = async (pgaId: string, amount: string) => {
    await tradeFinanceService.payBalancePayment(pgaId, amount);
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  const issueCertificateBlockchain = async (pgaId: string) => {
    await tradeFinanceService.issueCertificate(pgaId);
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  const createDeliveryAgreementBlockchain = async (params: any) => {
    await tradeFinanceService.createDeliveryAgreement(params);
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  const buyerConsentToDeliveryBlockchain = async (
    agreementId: string,
    consent: boolean,
  ) => {
    await tradeFinanceService.buyerConsentToDelivery(agreementId, consent);
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  const releasePaymentToSellerBlockchain = async (pgaId: string) => {
    await tradeFinanceService.releasePaymentToSeller(pgaId);
    setTimeout(() => loadHistoricalEvents(), 2000);
  };

  return (
    <TradeFinanceContext.Provider
      value={{
        applications,
        setApplications,
        drafts,
        setDrafts,
        addApplication,
        addDraft,
        updateApplicationStatus,
        updateDraftStatus,
        issueCertificate,
        updateShippingDetails,
        confirmDelivery,
        completeTransaction,
        updateApplicationStage,
        saveDraft,
        fetchBlockchainData,
        refreshAll,
        isRefreshing,
        createPGABlockchain,
        votePGABlockchain,
        sellerVotePGABlockchain,
        payCollateralBlockchain,
        confirmGoodsShippedBlockchain,
        payBalancePaymentBlockchain,
        issueCertificateBlockchain,
        createDeliveryAgreementBlockchain,
        buyerConsentToDeliveryBlockchain,
        releasePaymentToSellerBlockchain,
      }}
    >
      {children}
    </TradeFinanceContext.Provider>
  );
};

export const useTradeFinance = () => {
  const context = useContext(TradeFinanceContext);
  if (context === undefined) {
    throw new Error(
      "useTradeFinance must be used within a TradeFinanceProvider",
    );
  }
  return context;
};

export type { Application, DraftCertificate };

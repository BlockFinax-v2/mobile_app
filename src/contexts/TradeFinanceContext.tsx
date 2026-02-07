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
import { Storage } from "@/utils/storage";
import { backgroundDataLoader } from "@/services/backgroundDataLoader";
import { stakingService } from "@/services/stakingService";

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
    | "Collateral Paid"
    | "Logistics Notified"
    | "Logistics Claimed"
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
  beneficiaryName?: string;
  beneficiaryWallet?: string;
  proformaInvoiceIpfs?: { hash: string; url: string };
  salesContractIpfs?: { hash: string; url: string };
  documents?: string[];
  applicationDate: string;
  paymentDueDate: string;
  financingDuration: number;
  issuanceFee: string;
  collateralDescription: string;
  collateralValue: string;
  collateralPaid?: boolean; // Tracks if collateral has been paid
  issuanceFeePaid?: boolean; // Tracks if issuance fee has been paid

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
  refreshPGA: (pgaId: string) => Promise<void>; // Refresh specific PGA from blockchain
  isRefreshing: boolean; // Pull-to-refresh loading state
  preload: () => Promise<void>; // App startup preload
  createPGABlockchain: (params: any) => Promise<void>;
  votePGABlockchain: (pgaId: string, support: boolean) => Promise<void>;
  sellerVotePGABlockchain: (pgaId: string, approve: boolean) => Promise<void>;
  payCollateralBlockchain: (
    pgaId: string,
    tokenAddress: string,
  ) => Promise<void>;
  payIssuanceFeeBlockchain: (
    pgaId: string,
    tokenAddress: string,
  ) => Promise<void>;
  confirmGoodsShippedBlockchain: (pgaId: string) => Promise<void>;
  confirmGoodsDeliveredBlockchain: (pgaId: string) => Promise<void>;
  takeUpPGABlockchain: (pgaId: string) => Promise<void>;
  payBalancePaymentBlockchain: (
    pgaId: string,
    tokenAddress: string,
  ) => Promise<void>;
  issueCertificateBlockchain: (pgaId: string) => Promise<void>;
  createDeliveryAgreementBlockchain: (params: any) => Promise<void>;
  buyerConsentToDeliveryBlockchain: (
    agreementId: string,
    consent: boolean,
  ) => Promise<void>;
  releasePaymentToSellerBlockchain: (pgaId: string) => Promise<void>;

  // Logistics Discovery
  logisticsPartners: string[];
  deliveryPersons: string[];
  refreshLogisticsProviders: () => Promise<void>;

  // Data mapping
  mapPGAInfoToApplication: (pga: PGAInfo) => Application;
  mapPGAStatusToAppStatus: (
    status: PGAStatus,
    issuanceFeePaid?: boolean,
  ) => Application["status"];
  mapPGAStatusToStage: (status: PGAStatus, issuanceFeePaid?: boolean) => number;
}

export const TradeFinanceContext = createContext<
  TradeFinanceContextType | undefined
>(undefined);

export const mapPGAStatusToAppStatus = (
  status: PGAStatus,
  issuanceFeePaid: boolean = false,
): Application["status"] => {
  switch (status) {
    case PGAStatus.Created:
      return "Draft Sent to Pool";
    case PGAStatus.GuaranteeApproved:
      return "Draft Sent to Seller";
    case PGAStatus.SellerApproved:
      return "Seller Approved";
    case PGAStatus.CollateralPaid:
      return issuanceFeePaid ? "Certificate Issued" : "Collateral Paid";
    case PGAStatus.LogisticsNotified:
      return "Logistics Notified";
    case PGAStatus.LogisticsTakeup:
      return "Logistics Claimed";
    case PGAStatus.GoodsShipped:
      return "Goods Shipped";
    case PGAStatus.GoodsDelivered:
      return "Delivery Confirmed";
    case PGAStatus.BalancePaymentPaid:
      return "Invoice Settled";
    case PGAStatus.CertificateIssued:
      return "Transaction Complete";
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

export const mapPGAStatusToStage = (
  status: PGAStatus,
  issuanceFeePaid: boolean = false,
): number => {
  switch (status) {
    case PGAStatus.Created:
      return 2; // Pool Review
    case PGAStatus.GuaranteeApproved:
      return 3; // Seller Review
    case PGAStatus.SellerApproved:
      return 4; // Payment Pending
    case PGAStatus.CollateralPaid:
      return issuanceFeePaid ? 5 : 4; // Fee Paid → Stage 5 (Certificate Issued), otherwise stay in Stage 4
    case PGAStatus.LogisticsNotified:
      return 5; // Certificate / Logistics
    case PGAStatus.LogisticsTakeup:
      return 5; // Still in Logistics stage
    case PGAStatus.GoodsShipped:
      return 6; // Shipped
    case PGAStatus.GoodsDelivered:
      return 7; // Delivered
    case PGAStatus.BalancePaymentPaid:
      return 8; // Balance Paid
    case PGAStatus.CertificateIssued:
      return 9; // Complete
    case PGAStatus.Completed:
      return 9; // Complete
    case PGAStatus.Rejected:
      return 1;
    case PGAStatus.Expired:
      return 1;
    case PGAStatus.Disputed:
      return 8;
    default:
      return 1;
  }
};

export const mapPGAInfoToApplication = (
  pga: PGAInfo,
  selectedNetwork?: any,
): Application => {
  const symbol = selectedNetwork?.stablecoins?.[0]?.symbol || "USDC";
  return {
    id: pga.pgaId,
    requestId: pga.pgaId,
    companyName: pga.companyName || "Buyer",
    guaranteeAmount: `${pga.guaranteeAmount} ${symbol}`,
    tradeValue: `${pga.tradeValue} ${symbol}`,
    status: mapPGAStatusToAppStatus(pga.status, pga.issuanceFeePaid),
    submittedDate: new Date(pga.createdAt * 1000).toLocaleDateString(),
    contractNumber: "",
    tradeDescription: pga.tradeDescription || "",
    buyer: {
      company: pga.companyName || "Buyer",
      registration: pga.registrationNumber || "",
      country: "",
      contact: "",
      email: "",
      phone: "",
      walletAddress: pga.buyer || "",
      applicationDate: new Date(pga.createdAt * 1000).toLocaleDateString(),
    },
    seller: {
      walletAddress: pga.seller || "",
    },
    beneficiaryName: pga.beneficiaryName || "",
    beneficiaryWallet: pga.beneficiaryWallet || "",
    applicationDate: new Date(pga.createdAt * 1000).toISOString(),
    paymentDueDate: new Date(pga.votingDeadline * 1000).toLocaleDateString(),
    financingDuration: pga.duration,
    issuanceFee: `${pga.issuanceFee} ${symbol}`,
    collateralDescription: "",
    collateralValue: `${pga.collateralAmount} ${symbol}`,
    collateralPaid: pga.collateralPaid,
    issuanceFeePaid: pga.issuanceFeePaid,
    currentStage: mapPGAStatusToStage(pga.status, pga.issuanceFeePaid),
    isDraft: false,
    lastUpdated: new Date().toISOString(),
    certificateIssuedAt: pga.certificateIssuedAt,
    certificateIssuedDate:
      pga.certificateIssuedAt > 0
        ? new Date(pga.certificateIssuedAt * 1000).toLocaleDateString()
        : pga.status >= PGAStatus.CollateralPaid && pga.issuanceFeePaid
          ? new Date().toLocaleDateString()
          : undefined,
    deliveryAgreementId: pga.deliveryAgreementId,
  };
};

export const TradeFinanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [drafts, setDrafts] = useState<DraftCertificate[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncedBlock, setLastSyncedBlock] = useState<number>(0);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState<boolean>(true);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const [logisticsPartners, setLogisticsPartners] = useState<string[]>([]);
  const [deliveryPersons, setDeliveryPersons] = useState<string[]>([]);
  const [isFinancier, setIsFinancier] = useState<boolean>(false);

  // Prevent re-initialization on screen navigation
  const hasInitialized = useRef(false);
  const lastInitializedKey = useRef<string | null>(null);
  const hasLoadedCache = useRef(false);

  const addApplication = (application: Application) => {
    setApplications((prev) => [application, ...prev]);
    setTimeout(() => persistData(), 0);
  };

  const addDraft = (draft: DraftCertificate) => {
    setDrafts((prev) => [draft, ...prev]);
    setTimeout(() => persistData(), 0);
  };

  const updateApplicationStatus = (
    id: string,
    status: Application["status"],
  ) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status } : app)),
    );
    setTimeout(() => persistData(), 0);
  };

  const updateDraftStatus = (
    id: string,
    status: DraftCertificate["status"],
  ) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, status } : draft)),
    );
    setTimeout(() => persistData(), 0);
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
    setTimeout(() => persistData(), 0);
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
    setTimeout(() => persistData(), 0);
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
    setTimeout(() => persistData(), 0);
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
    setTimeout(() => persistData(), 0);
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
    setTimeout(() => persistData(), 0);
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
  const persistData = useCallback(async () => {
    if (!selectedNetwork || !address) return;

    try {
      await Storage.setJSON(APPS_STORAGE_KEY, applications);
      await Storage.setJSON(DRAFTS_STORAGE_KEY, drafts);
      await Storage.setItem(SYNC_TIME_KEY, Date.now().toString());

      console.log("[TradeFinanceContext] ⚡ Data persisted to AsyncStorage");
    } catch (error) {
      console.error("[TradeFinanceContext] ❌ Persistence failed:", error);
      // Data will be re-persisted on next update
    }
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
    if (!selectedNetwork || !address) return false;

    const startTime = performance.now();
    setIsLoadingFromCache(true);

    try {
      const [cachedApps, cachedDrafts, lastSync] = await Promise.all([
        Storage.getJSON<Application[]>(APPS_STORAGE_KEY),
        Storage.getJSON<DraftCertificate[]>(DRAFTS_STORAGE_KEY),
        Storage.getItem(SYNC_TIME_KEY),
      ]);

      // Validate cached data - filter out potentially invalid entries
      if (cachedApps) {
        // Check if cache is too old (>7 days) and might contain deleted PGAs
        const cacheAge = lastSync
          ? (Date.now() - parseInt(lastSync, 10)) / 1000
          : Infinity;
        const isStale = cacheAge > 7 * 24 * 60 * 60; // 7 days

        if (isStale) {
          console.log(
            `[TradeFinanceContext] ⚠️ Cache is ${Math.floor(cacheAge / 86400)} days old - will validate with blockchain`,
          );
        }
        setApplications(cachedApps);
      }
      if (cachedDrafts) setDrafts(cachedDrafts);

      hasLoadedCache.current = Boolean(cachedApps || cachedDrafts);

      const loadTime = performance.now() - startTime;
      console.log(
        `[TradeFinanceContext] ⚡ Cache loaded from AsyncStorage in ${loadTime.toFixed(2)}ms`,
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
    const loadLastBlock = async () => {
      if (selectedNetwork && address) {
        const stored = await Storage.getItem(STORAGE_KEY);
        if (stored) {
          setLastSyncedBlock(parseInt(stored, 10));
        }
      }
    };
    loadLastBlock();
  }, [selectedNetwork?.chainId, address]);

  // Save last synced block to storage
  const saveLastSyncedBlock = async (blockNumber: number) => {
    await Storage.setItem(STORAGE_KEY, blockNumber.toString());
    setLastSyncedBlock(blockNumber);
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

  const refreshLogisticsProviders = useCallback(async () => {
    try {
      const [partners, persons] = await Promise.all([
        tradeFinanceService.getAllLogisticsPartners(),
        tradeFinanceService.getAllDeliveryPersons(),
      ]);
      setLogisticsPartners(partners);
      setDeliveryPersons(persons);
    } catch (error) {
      console.warn(
        "[TradeFinanceContext] Failed to fetch logistics providers:",
        error,
      );
    }
  }, []);

  const fetchBlockchainData = useCallback(async () => {
    if (!address || !isUnlocked) return;
    try {
      // CRITICAL: Check if user is a financier first
      const financierStatus = await stakingService.isFinancier(address);
      setIsFinancier(financierStatus || false);

      // Check if user is logistics partner
      const isLogistics =
        await tradeFinanceService.isAuthorizedLogisticsPartner(address);
      const isDeliveryPerson = deliveryPersons.includes(address.toLowerCase());

      console.log(
        `[TradeFinanceContext] 👤 User roles - Financier: ${financierStatus}, Logistics: ${isLogistics}, Delivery: ${isDeliveryPerson}`,
      );

      let allPGAInfos: PGAInfo[] = [];

      if (financierStatus || isLogistics || isDeliveryPerson) {
        // SPECIAL ROLES: Fetch ALL PGAs (financiers vote, logistics get assigned)
        console.log(
          "[TradeFinanceContext] 💼 Fetching ALL PGAs for special role (financier/logistics)...",
        );
        const allPGAIds = await tradeFinanceService.getAllActivePGAs();
        const pgaPromises = allPGAIds.map((id) =>
          tradeFinanceService.getPGA(id).catch(() => null),
        );
        allPGAInfos = (await Promise.all(pgaPromises)).filter(
          (p) => p !== null,
        ) as PGAInfo[];

        // For logistics, filter to only assigned PGAs
        if (!financierStatus && (isLogistics || isDeliveryPerson)) {
          const normalizedAddress = address.toLowerCase();
          allPGAInfos = allPGAInfos.filter(
            (pga) =>
              pga.logisticsPartner?.toLowerCase() === normalizedAddress ||
              pga.buyer?.toLowerCase() === normalizedAddress ||
              pga.seller?.toLowerCase() === normalizedAddress,
          );
          console.log(
            `[TradeFinanceContext] ✅ Filtered to ${allPGAInfos.length} PGAs for logistics partner`,
          );
        } else {
          console.log(
            `[TradeFinanceContext] ✅ Loaded ${allPGAInfos.length} PGAs for financier`,
          );
        }
      } else {
        // BUYERS/SELLERS: Fetch only their specific PGAs
        const buyerPGAs = await tradeFinanceService.getAllPGAsByBuyer(address);
        const sellerPGAs =
          await tradeFinanceService.getAllPGAsBySeller(address);
        allPGAInfos = [...buyerPGAs, ...sellerPGAs];
        console.log(
          `[TradeFinanceContext] ✅ Loaded ${buyerPGAs.length} buyer + ${sellerPGAs.length} seller PGAs`,
        );
      }

      const allApps = allPGAInfos.map((pga) =>
        mapPGAInfoToApplication(pga, selectedNetwork),
      );
      const uniqueMap = new Map<string, Application>();
      allApps.forEach((app) => uniqueMap.set(app.id, app));

      setApplications(Array.from(uniqueMap.values()));

      // Refresh logistics providers in background
      refreshLogisticsProviders();
    } catch (error: any) {
      // Gracefully handle PGANotFound and other contract errors
      if (
        error?.code === "CALL_EXCEPTION" &&
        error?.errorName === "PGANotFound"
      ) {
        console.log(
          "[TradeFinanceContext] ℹ️ Some cached PGAs no longer exist - clearing stale cache",
        );
        // Clear potentially stale cache and retry
        setApplications([]);
      } else {
        console.error(
          "[TradeFinanceContext] Error fetching blockchain data:",
          error,
        );
      }
    }
  }, [address, isUnlocked, refreshLogisticsProviders, selectedNetwork]);

  /**
   * Handle real-time events from the blockchain
   */
  /**
   * Determine if an event should remove a card from the list
   * Cards persist until explicit removal events are emitted
   *
   * Removal triggers:
   * - PGACompleted: Transaction fully complete
   * - PGACancelled: Transaction cancelled
   * - PGAExpired: Voting period expired without approval
   * - Status changed to Rejected/Cancelled
   */
  const shouldRemoveCard = useCallback((event: PGAEvent): boolean => {
    // PGACompleted event = transaction finished, remove card
    if (event.eventType === "PGACompleted") {
      console.log(
        `[TradeFinanceContext] 🗑️ Removing completed PGA: ${event.pgaId}`,
      );
      return true;
    }

    // Status change to terminal states = remove card
    if (event.eventType === "PGAStatusChanged") {
      const newStatus = event.data.newStatus;
      // Remove if status is Rejected (5), Cancelled (6), or Expired
      if (newStatus === 5 || newStatus === 6) {
        console.log(
          `[TradeFinanceContext] 🗑️ Removing PGA with terminal status: ${event.pgaId}`,
        );
        return true;
      }
    }

    return false;
  }, []);

  /**
   * Real-time event handler - optimized for microsecond-level updates
   * Uses fire-and-forget persistence and optimistic UI updates
   * ⚡ PERSISTENCE: Cards persist until removal events are emitted
   * 🎯 ROLE-BASED: Properly handles buyer, seller, financier, and logistics visibility
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

        // ⚡ PERFORMANCE: Invalidate cache for this PGA to ensure fresh data
        tradeFinanceService.invalidatePGACache(event.pgaId);

        // 🗑️ PERSISTENCE: Check if this event should remove the card
        if (shouldRemoveCard(event)) {
          console.log(
            `[TradeFinanceContext] 🗑️ Removing card for PGA: ${event.pgaId}`,
          );

          setApplications((prev) =>
            prev.filter((app) => app.id !== event.pgaId),
          );

          // Persist the removal
          persistData();

          // Clean up pending flag
          setTimeout(() => pendingUpdates.delete(eventKey), 1000);
          return;
        }

        // 🎯 ROLE-BASED VISIBILITY CHECK
        // Determine if this user should see this PGA card
        const shouldShowCard = await (async () => {
          const normalizedAddress = address?.toLowerCase();

          // Always show if user is buyer or seller
          if (event.data.buyer?.toLowerCase() === normalizedAddress) {
            console.log(
              `[TradeFinanceContext] 🎯 User is BUYER - showing card`,
            );
            return true;
          }
          if (event.data.seller?.toLowerCase() === normalizedAddress) {
            console.log(
              `[TradeFinanceContext] 🎯 User is SELLER - showing card`,
            );
            return true;
          }

          // Check if user is financier (should see ALL PGAs for voting)
          if (isFinancier) {
            console.log(
              `[TradeFinanceContext] 🎯 User is FINANCIER - showing card for pool voting`,
            );
            return true;
          }

          // For other events, check if user is logistics partner
          if (
            event.data.logisticPartner?.toLowerCase() === normalizedAddress ||
            event.data.deliveryPerson?.toLowerCase() === normalizedAddress
          ) {
            console.log(
              `[TradeFinanceContext] 🎯 User is LOGISTICS - showing card`,
            );
            return true;
          }

          console.log(
            `[TradeFinanceContext] ⏭️ User not involved in PGA ${event.pgaId} - skipping card`,
          );
          return false;
        })();

        if (!shouldShowCard) {
          setTimeout(() => pendingUpdates.delete(eventKey), 1000);
          return;
        }

        // Fetch updated PGA data (will get from blockchain since cache is invalidated)
        const pgaInfo = await tradeFinanceService.getPGA(event.pgaId);
        const updatedApp = mapPGAInfoToApplication(pgaInfo, selectedNetwork);

        // Special handling: When fee is paid (CollateralPaid), ensure certificate is issued
        if (event.eventType === "CollateralPaid") {
          console.log(
            `[TradeFinanceContext] 💳 Fee paid for PGA ${event.pgaId} → Certificate issued simultaneously with Logistics notification`,
          );
          // Certificate is now considered issued as per redesigned flow
        }

        // Log the card action for visibility
        console.log(
          `[TradeFinanceContext] 🔔 ${event.eventType} → Card UPDATE for PGA ${event.pgaId} (Status: ${mapPGAStatusToAppStatus(pgaInfo.status, pgaInfo.issuanceFeePaid)})`,
        );

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

        // Save latest block (instant)
        if (event.blockNumber > lastSyncedBlock) {
          saveLastSyncedBlock(event.blockNumber);
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
    [
      lastSyncedBlock,
      persistData,
      pendingUpdates,
      shouldRemoveCard,
      address,
      isFinancier,
      selectedNetwork,
    ],
  );

  /**
   * Load historical events on initial mount with systematic block range management
   * ⚡ OPTIMIZED: Direct blockchain queries instead of event scanning
   * 🎯 STRATEGY:
   *    - On login: fetchBlockchainData() queries contract directly (instant)
   *    - While active: Real-time event listeners update state
   *    - No event scanning: Blockchain queries are faster & more reliable
   */
  const loadHistoricalEvents = useCallback(async () => {
    if (!address || !isUnlocked || isLoadingHistory) return;

    setIsLoadingHistory(true);
    const startTime = performance.now();

    try {
      const currentBlock =
        await tradeFinanceEventService["provider"]?.getBlockNumber();

      // DIRECT BLOCKCHAIN QUERY: Always fetch fresh data from contract
      // This is faster than scanning events and works for offline users
      console.log(
        `[TradeFinanceContext] 🔄 Fetching PGAs via direct blockchain query (faster than event scanning)`,
      );

      // If no cached data or first load, fetch everything
      if (applications.length === 0) {
        console.log(
          "[TradeFinanceContext] 🚀 Initial load - querying blockchain for all user PGAs...",
        );
        await fetchBlockchainData();
        await saveLastSyncedBlock(currentBlock || 0);
        setIsLoadingHistory(false);
        return;
      }

      // If already have data, just sync new events from recent blocks (200 blocks)
      const fromBlock =
        lastSyncedBlock > 0
          ? lastSyncedBlock + 1
          : Math.max(0, (currentBlock || 0) - 200);
      const blocksToSync = currentBlock ? currentBlock - fromBlock : 0;

      // Skip if already synced (no new blocks)
      if (blocksToSync === 0 && lastSyncedBlock > 0) {
        console.log("[TradeFinanceContext] ✅ Already synced - no new blocks");
        setIsLoadingHistory(false);
        return;
      }

      const maxBlockRange = 200; // Only sync recent events for incremental updates
      const syncCurrentBlock = currentBlock || 0;
      const syncFromBlock =
        blocksToSync > maxBlockRange
          ? syncCurrentBlock - maxBlockRange
          : fromBlock;

      console.log(
        `[TradeFinanceContext] 🔄 Incremental sync: ${syncCurrentBlock - syncFromBlock} blocks (${syncFromBlock} → ${syncCurrentBlock})`,
      );

      // INCREMENTAL UPDATES: Only fetch events for new blocks (very fast)
      // Removed secondary redeclaration of maxBlockRange

      const pastEvents = await tradeFinanceEventService.fetchPastEvents(
        address,
        syncFromBlock, // Use our calculated syncFromBlock
        "latest",
        maxBlockRange,
      );

      console.log(
        `[TradeFinanceContext] ✅ Fetched ${pastEvents.length} new events in ${(performance.now() - startTime).toFixed(0)}ms`,
      );

      // EVENT-DRIVEN UPDATES: Apply changes only to affected PGAs
      if (pastEvents.length > 0) {
        const pgaIds = new Set<string>();
        pastEvents.forEach((event) => pgaIds.add(event.pgaId));

        console.log(
          `[TradeFinanceContext] 📝 Updating ${pgaIds.size} PGAs with new events...`,
        );

        // 🎯 ROLE-BASED FILTERING: Only fetch PGAs relevant to this user
        const relevantPGAIds = Array.from(pgaIds).filter((pgaId) => {
          // If user is financier, show ALL PGAs (for pool voting)
          if (isFinancier) return true;

          // Find at least one event for this PGA that involves the user
          const relatedEvent = pastEvents.find((e) => {
            if (e.pgaId !== pgaId) return false;
            const normalizedAddress = address.toLowerCase();
            return (
              e.data.buyer?.toLowerCase() === normalizedAddress ||
              e.data.seller?.toLowerCase() === normalizedAddress ||
              e.data.logisticPartner?.toLowerCase() === normalizedAddress ||
              e.data.deliveryPerson?.toLowerCase() === normalizedAddress
            );
          });
          return relatedEvent !== undefined;
        });

        console.log(
          `[TradeFinanceContext] 🎯 ${relevantPGAIds.length}/${pgaIds.size} PGAs are relevant to user`,
        );

        // Fetch ONLY the PGAs that have new events AND are relevant to user
        const pgaPromises = relevantPGAIds.map((pgaId) =>
          tradeFinanceService.getPGA(pgaId, true).catch((err: any) => {
            if (err?.errorName === "PGANotFound") {
              console.log(
                `[TradeFinanceContext] ℹ️ PGA ${pgaId} no longer exists (deleted/expired)`,
              );
            } else {
              console.warn(
                `[TradeFinanceContext] Failed to fetch PGA ${pgaId}:`,
                err.message || err,
              );
            }
            return null;
          }),
        );

        const updatedPGAs = (await Promise.all(pgaPromises)).filter(
          (p) => p !== null,
        ) as PGAInfo[];

        const updatedApps = updatedPGAs.map((pga) =>
          mapPGAInfoToApplication(pga, selectedNetwork),
        );

        // SMART MERGE: Update existing PGAs, add new ones, NEVER remove
        setApplications((prev) => {
          const appMap = new Map(prev.map((app) => [app.id, app]));
          updatedApps.forEach((app) => appMap.set(app.id, app));
          const merged = Array.from(appMap.values());
          console.log(
            `[TradeFinanceContext] 💾 Total PGAs: ${merged.length} (${updatedApps.length} updated)`,
          );
          return merged;
        });
      }

      // PERSIST TO STORAGE: Save all PGAs for offline access and fast next load
      persistData();

      // UPDATE SYNC CHECKPOINT: Save the latest block so we only fetch new events next time
      const latestBlock = tradeFinanceEventService.getLastProcessedBlock();
      if (latestBlock > lastSyncedBlock) {
        saveLastSyncedBlock(latestBlock);
      }

      const totalTime = performance.now() - startTime;
      console.log(
        `[TradeFinanceContext] ⚡ Incremental sync complete in ${totalTime.toFixed(0)}ms - PGAs persist forever`,
      );
    } catch (error) {
      console.error(
        "[TradeFinanceContext] ⚠️ Error loading historical events:",
        error,
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, [
    address,
    isUnlocked,
    lastSyncedBlock,
    isLoadingHistory,
    persistData,
    fetchBlockchainData,
    saveLastSyncedBlock,
    isFinancier,
    selectedNetwork,
  ]);

  const preload = useCallback(async () => {
    if (!address || !isUnlocked || !selectedNetwork) return;

    const initKey = `${address}_${selectedNetwork.chainId}`;
    if (hasInitialized.current && lastInitializedKey.current === initKey) {
      return;
    }

    console.log(
      "[TradeFinanceContext] ⚡ INSTANT LOAD - Using background preloaded data...",
    );
    const preloadStart = performance.now();

    try {
      // CRITICAL: Check financier status FIRST
      const financierStatus = await stakingService.isFinancier(address);
      setIsFinancier(financierStatus || false);
      console.log(
        `[TradeFinanceContext] 🎯 Financier status: ${financierStatus}`,
      );

      // 1. Load background preloaded data (INSTANT - already fetched during unlock screen)
      const cachedData = await backgroundDataLoader.getCachedTradeFinanceData();

      if (cachedData.applications.length > 0) {
        console.log(
          `[TradeFinanceContext] 📦 Found ${cachedData.applications.length} preloaded PGAs`,
        );

        // Map PGAs to applications and filter out any invalid ones
        const apps = cachedData.applications
          .map((pga: any) => {
            try {
              return mapPGAInfoToApplication(pga, selectedNetwork);
            } catch (error) {
              console.warn(
                `[TradeFinanceContext] ⚠️ Skipping invalid PGA:`,
                error,
              );
              return null;
            }
          })
          .filter((app: Application | null) => app !== null) as Application[];

        setApplications(apps);
        setLogisticsPartners(cachedData.logisticsPartners);
        setDeliveryPersons(cachedData.deliveryPersons);

        const loadTime = performance.now() - preloadStart;
        console.log(
          `[TradeFinanceContext] ✅ INSTANT load in ${loadTime.toFixed(0)}ms (preloaded data)`,
        );
      } else {
        // Fallback to legacy cached data if background preload missed
        console.log(
          "[TradeFinanceContext] 📊 No preloaded data - using legacy cache",
        );
        await loadCachedData();
      }

      // 2. CRITICAL: Always fetch fresh blockchain data on login
      // This ensures offline users see PGAs created while they were away
      console.log(
        "[TradeFinanceContext] 🔄 Fetching fresh blockchain data (catches offline transactions)...",
      );
      await fetchBlockchainData();

      // 3. Start real-time listeners immediately (no need to wait for sync)
      tradeFinanceEventService.startListening(address, handleRealtimeEvent);

      // 4. Fetch only NEW events since last sync (background, non-blocking)
      // This runs after UI is already shown to user
      loadHistoricalEvents().catch((err) => {
        console.warn("[TradeFinanceContext] Background sync error:", err);
      });

      hasInitialized.current = true;
      lastInitializedKey.current = initKey;

      const totalTime = performance.now() - preloadStart;
      console.log(
        `[TradeFinanceContext] ✅ Context ready in ${totalTime.toFixed(0)}ms`,
      );
    } catch (error: any) {
      // Handle specific errors gracefully
      if (error?.errorName === "PGANotFound") {
        console.log(
          "[TradeFinanceContext] ℹ️ Some cached PGAs don't exist - will refresh from blockchain",
        );
        await loadCachedData();
      } else {
        console.error("[TradeFinanceContext] Preload error:", error);
      }
      // Fallback to full fetch
      await fetchBlockchainData();
    }
  }, [
    address,
    isUnlocked,
    selectedNetwork,
    loadCachedData,
    loadHistoricalEvents,
    fetchBlockchainData,
    handleRealtimeEvent,
    mapPGAInfoToApplication,
    applications.length,
  ]);

  // SMART BACKGROUND SYNC: Only fetch NEW events every 2 minutes (not full refresh)
  useEffect(() => {
    if (!address || !isUnlocked || !selectedNetwork) return;

    const intervalId = setInterval(
      () => {
        console.log(
          "[TradeFinanceContext] ⏰ Background sync - checking for new events...",
        );
        loadHistoricalEvents(); // Only fetches NEW events since last sync
      },
      2 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [address, isUnlocked, selectedNetwork, loadHistoricalEvents]);

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
          const updatedApps = pgaInfos.map((pga) =>
            mapPGAInfoToApplication(pga, selectedNetwork),
          );

          // Merge with existing applications
          setApplications((prev) => {
            const existingMap = new Map(prev.map((app) => [app.id, app]));
            updatedApps.forEach((app) => existingMap.set(app.id, app));
            return Array.from(existingMap.values());
          });

          // Save last processed block
          saveLastSyncedBlock(currentBlock);
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
        "[TradeFinanceContext] Initializing with blockchain-first strategy...",
      );

      // 1. CRITICAL: Always fetch fresh blockchain data first
      // This ensures users see all their PGAs even after clearing app data
      console.log(
        "[TradeFinanceContext] 🔄 Fetching fresh blockchain data (universal data source)...",
      );
      await fetchBlockchainData();

      // 2. Load historical events in background (for incremental sync)
      await loadHistoricalEvents();

      // 3. Start listening for real-time events
      tradeFinanceEventService.startListening(address, handleRealtimeEvent);

      hasInitialized.current = true;
      lastInitializedKey.current = initKey;
      console.log(
        "[TradeFinanceContext] ✅ Initialization complete (blockchain + sync)",
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
    fetchBlockchainData,
    loadHistoricalEvents,
    handleRealtimeEvent,
  ]);

  // Force refresh a specific PGA from blockchain
  const refreshPGA = async (pgaId: string) => {
    try {
      console.log(`[TradeFinanceContext] 🔄 Force refreshing PGA: ${pgaId}`);

      // Invalidate cache
      tradeFinanceService.invalidatePGACache(pgaId);

      // Fetch fresh data from blockchain
      const updatedPGA = await tradeFinanceService.getPGA(pgaId, true);
      const updatedApp = mapPGAInfoToApplication(updatedPGA, selectedNetwork);

      // Update state
      setApplications((prev) => {
        const appMap = new Map(prev.map((app) => [app.id, app]));
        appMap.set(updatedApp.id, updatedApp);
        const updated = Array.from(appMap.values());

        // Persist
        setTimeout(() => persistData(), 0);

        return updated;
      });

      console.log(
        `[TradeFinanceContext] ✅ PGA ${pgaId} refreshed successfully`,
      );
    } catch (error: any) {
      if (error?.errorName === "PGANotFound") {
        console.log(
          `[TradeFinanceContext] ℹ️ PGA ${pgaId} no longer exists - removing from cache`,
        );
        // Remove the non-existent PGA from state
        setApplications((prev) => prev.filter((app) => app.id !== pgaId));
        setTimeout(() => persistData(), 0);
      } else {
        console.error(
          `[TradeFinanceContext] ❌ Error refreshing PGA ${pgaId}:`,
          error,
        );
        throw error;
      }
    }
  };

  const createPGABlockchain = async (params: any) => {
    await tradeFinanceService.createPGA(params);
    await refreshPGA(params.pgaId);
    loadHistoricalEvents();
  };

  const votePGABlockchain = async (pgaId: string, support: boolean) => {
    await tradeFinanceService.voteOnPGA(pgaId, support);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
  };

  const sellerVotePGABlockchain = async (pgaId: string, approve: boolean) => {
    await tradeFinanceService.sellerVoteOnPGA(pgaId, approve);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
  };

  const payCollateralBlockchain = async (
    pgaId: string,
    tokenAddress: string,
  ) => {
    await tradeFinanceService.payCollateral(pgaId, tokenAddress);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
  };

  const payIssuanceFeeBlockchain = async (
    pgaId: string,
    tokenAddress: string,
  ) => {
    await tradeFinanceService.payIssuanceFee(pgaId, tokenAddress);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
  };

  const confirmGoodsShippedBlockchain = async (pgaId: string) => {
    await tradeFinanceService.confirmGoodsShipped(pgaId);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
  };

  const payBalancePaymentBlockchain = async (
    pgaId: string,
    tokenAddress: string,
  ) => {
    await tradeFinanceService.payBalancePayment(pgaId, tokenAddress);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
  };

  const issueCertificateBlockchain = async (pgaId: string) => {
    await tradeFinanceService.issueCertificate(pgaId);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
  };

  const createDeliveryAgreementBlockchain = async (params: any) => {
    await tradeFinanceService.createDeliveryAgreement(params);
    await refreshPGA(params.pgaId);
    loadHistoricalEvents();
  };

  const buyerConsentToDeliveryBlockchain = async (
    agreementId: string,
    consent: boolean,
  ) => {
    await tradeFinanceService.buyerConsentToDelivery(agreementId, consent);
    // Find pgaId by agreementId
    const app = applications.find((a) => a.deliveryAgreementId === agreementId);
    if (app) {
      await refreshPGA(app.id);
    }
    loadHistoricalEvents();
  };

  const releasePaymentToSellerBlockchain = async (pgaId: string) => {
    await tradeFinanceService.releasePaymentToSeller(pgaId);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
  };

  // New methods
  const confirmGoodsDeliveredBlockchain = async (pgaId: string) => {
    await tradeFinanceService.confirmGoodsDelivered(pgaId);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
  };

  const takeUpPGABlockchain = async (pgaId: string) => {
    await tradeFinanceService.takeUpPGA(pgaId);
    await refreshPGA(pgaId);
    loadHistoricalEvents();
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
        refreshPGA,
        isRefreshing,
        preload,
        createPGABlockchain,
        votePGABlockchain,
        sellerVotePGABlockchain,
        payCollateralBlockchain,
        payIssuanceFeeBlockchain,
        confirmGoodsShippedBlockchain,
        payBalancePaymentBlockchain,
        issueCertificateBlockchain,
        createDeliveryAgreementBlockchain,
        buyerConsentToDeliveryBlockchain,
        releasePaymentToSellerBlockchain,
        logisticsPartners,
        deliveryPersons,
        refreshLogisticsProviders,
        confirmGoodsDeliveredBlockchain,
        takeUpPGABlockchain,
        mapPGAInfoToApplication: (pga: PGAInfo) =>
          mapPGAInfoToApplication(pga, selectedNetwork),
        mapPGAStatusToAppStatus,
        mapPGAStatusToStage,
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

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { tradeFinanceService, PGAInfo, PGAStatus } from "@/services/tradeFinanceService";
import { useWallet } from "./WalletContext";

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
    shippingDetails: Application["proofOfShipment"]
  ) => void;

  // Stage 7: Delivery confirmation
  confirmDelivery: (
    applicationId: string,
    confirmedBy: "buyer" | "seller"
  ) => void;

  // Stage 8: Complete transaction
  completeTransaction: (applicationId: string, finalAmount: string) => void;

  // Progress and persistence
  updateApplicationStage: (id: string, stage: number) => void;
  saveDraft: (application: Application) => void;

  // Blockchain Sync
  fetchBlockchainData: () => Promise<void>;
  createPGABlockchain: (params: any) => Promise<void>;
  votePGABlockchain: (pgaId: string, support: boolean) => Promise<void>;
  sellerVotePGABlockchain: (pgaId: string, approve: boolean) => Promise<void>;
  payCollateralBlockchain: (pgaId: string, amount: string) => Promise<void>;
  confirmGoodsShippedBlockchain: (pgaId: string, logisticPartnerName: string) => Promise<void>;
  payBalancePaymentBlockchain: (pgaId: string, amount: string) => Promise<void>;
  issueCertificateBlockchain: (pgaId: string) => Promise<void>;
  createDeliveryAgreementBlockchain: (params: any) => Promise<void>;
  buyerConsentToDeliveryBlockchain: (agreementId: string, consent: boolean) => Promise<void>;
  releasePaymentToSellerBlockchain: (pgaId: string) => Promise<void>;
}

const TradeFinanceContext = createContext<TradeFinanceContextType | undefined>(
  undefined
);

export const TradeFinanceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [drafts, setDrafts] = useState<DraftCertificate[]>([]);

  const addApplication = (application: Application) => {
    setApplications((prev) => [application, ...prev]);
  };

  const addDraft = (draft: DraftCertificate) => {
    setDrafts((prev) => [draft, ...prev]);
  };

  const updateApplicationStatus = (
    id: string,
    status: Application["status"]
  ) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status } : app))
    );
  };

  const updateDraftStatus = (
    id: string,
    status: DraftCertificate["status"]
  ) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, status } : draft))
    );
  };

  // Stage 5: Certificate issuance
  const issueCertificate = (
    applicationId: string,
    certificateContent: string
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
          : app
      )
    );

    // Update corresponding draft
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.requestId === applicationId
          ? { ...draft, status: "CERTIFICATE_ISSUED" }
          : draft
      )
    );
  };

  // Stage 6: Shipping confirmation
  const updateShippingDetails = (
    applicationId: string,
    shippingDetails: Application["proofOfShipment"]
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
          : app
      )
    );
  };

  // Stage 7: Delivery confirmation
  const confirmDelivery = (
    applicationId: string,
    confirmedBy: "buyer" | "seller"
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
          : app
      )
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
          : app
      )
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
          : app
      )
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
            : app
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

  // Sync network with service
  useEffect(() => {
    if (selectedNetwork) {
      tradeFinanceService.setNetwork(selectedNetwork.chainId, selectedNetwork);
    }
  }, [selectedNetwork]);

  const mapPGAStatusToAppStatus = (status: PGAStatus): Application["status"] => {
    switch (status) {
      case PGAStatus.Created: return "Draft Sent to Pool";
      case PGAStatus.GuaranteeApproved: return "Draft Sent to Seller";
      case PGAStatus.SellerApproved: return "Seller Approved";
      case PGAStatus.CollateralPaid: return "Fee Paid";
      case PGAStatus.GoodsShipped: return "Goods Shipped";
      case PGAStatus.BalancePaymentPaid: return "Invoice Settled";
      case PGAStatus.CertificateIssued: return "Certificate Issued";
      case PGAStatus.DeliveryAwaitingConsent: return "Awaiting Certificate"; 
      case PGAStatus.Completed: return "Transaction Complete";
      case PGAStatus.Rejected: return "Pending Draft";
      case PGAStatus.Expired: return "Pending Draft";
      case PGAStatus.Disputed: return "Processing";
      default: return "Pending Draft";
    }
  };

  const mapPGAStatusToStage = (status: PGAStatus): number => {
    switch (status) {
      case PGAStatus.Created: return 2; // Pool Review
      case PGAStatus.GuaranteeApproved: return 3; // Seller Review
      case PGAStatus.SellerApproved: return 4; // Seller Approved
      case PGAStatus.CollateralPaid: return 4; // Fee Paid
      case PGAStatus.CertificateIssued: return 5;
      case PGAStatus.GoodsShipped: return 6;
      case PGAStatus.DeliveryAwaitingConsent: return 7;
      case PGAStatus.BalancePaymentPaid: return 8;
      case PGAStatus.Completed: return 9;
      case PGAStatus.Rejected: return 1;
      case PGAStatus.Expired: return 1;
      case PGAStatus.Disputed: return 7;
      default: return 1;
    }
  };

  const mapPGAInfoToApplication = (pga: PGAInfo): Application => {
    const symbol = selectedNetwork?.stablecoins?.[0]?.symbol || "USDC";
    return {
      id: pga.pgaId,
      requestId: pga.pgaId,
      companyName: "", // Need metadata
      guaranteeAmount: `${pga.guaranteeAmount} ${symbol}`,
      tradeValue: `${pga.tradeValue} ${symbol}`,
      status: mapPGAStatusToAppStatus(pga.status),
      submittedDate: new Date(pga.createdAt * 1000).toLocaleDateString(),
      contractNumber: "", 
      tradeDescription: pga.tradeDescription || "",
      buyer: {
        company: "",
        registration: "",
        country: "",
        contact: "",
        email: "",
        phone: "",
        walletAddress: pga.buyer,
        applicationDate: new Date(pga.createdAt * 1000).toISOString(),
      },
      seller: {
        walletAddress: pga.seller,
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
      
      const allApps = [...buyerPGAs, ...sellerPGAs].map(mapPGAInfoToApplication);
      setApplications(allApps);
    } catch (error) {
      console.error("Error fetching blockchain data:", error);
    }
  }, [address, isUnlocked]);

  useEffect(() => {
    fetchBlockchainData();
  }, [fetchBlockchainData]);

  const createPGABlockchain = async (params: any) => {
    await tradeFinanceService.createPGA(params);
    await fetchBlockchainData();
  };

  const votePGABlockchain = async (pgaId: string, support: boolean) => {
    await tradeFinanceService.voteOnPGA(pgaId, support);
    await fetchBlockchainData();
  };

  const sellerVotePGABlockchain = async (pgaId: string, approve: boolean) => {
    await tradeFinanceService.sellerVoteOnPGA(pgaId, approve);
    await fetchBlockchainData();
  };

  const payCollateralBlockchain = async (pgaId: string, amount: string) => {
    await tradeFinanceService.payCollateral(pgaId, amount);
    await fetchBlockchainData();
  };

  const confirmGoodsShippedBlockchain = async (pgaId: string, logisticPartnerName: string) => {
    await tradeFinanceService.confirmGoodsShipped(pgaId, logisticPartnerName);
    await fetchBlockchainData();
  };

  const payBalancePaymentBlockchain = async (pgaId: string, amount: string) => {
    await tradeFinanceService.payBalancePayment(pgaId, amount);
    await fetchBlockchainData();
  };

  const issueCertificateBlockchain = async (pgaId: string) => {
    await tradeFinanceService.issueCertificate(pgaId);
    await fetchBlockchainData();
  };

  const createDeliveryAgreementBlockchain = async (params: any) => {
    await tradeFinanceService.createDeliveryAgreement(params);
    await fetchBlockchainData();
  };

  const buyerConsentToDeliveryBlockchain = async (agreementId: string, consent: boolean) => {
    await tradeFinanceService.buyerConsentToDelivery(agreementId, consent);
    await fetchBlockchainData();
  };

  const releasePaymentToSellerBlockchain = async (pgaId: string) => {
    await tradeFinanceService.releasePaymentToSeller(pgaId);
    await fetchBlockchainData();
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
      "useTradeFinance must be used within a TradeFinanceProvider"
    );
  }
  return context;
};

export type { Application, DraftCertificate };

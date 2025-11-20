import React, { createContext, useContext, useState, ReactNode } from "react";

interface Application {
  id: string;
  requestId: string;
  companyName: string;
  guaranteeAmount: string;
  tradeValue: string;
  status:
    | "Draft Sent"
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

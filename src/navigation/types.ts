import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  App: undefined;
  BiometricSetup: {
    walletPassword: string;
    returnTo: keyof RootStackParamList;
  };
  ActiveCallScreen: {
    callData: {
      callId: string;
      participantAddress: string;
      participantName: string;
      callType: string;
      isIncoming: boolean;
      status: string;
    };
    localStream: any;
    remoteStream: any;
  };
  IncomingCallScreen: {
    callData: {
      callId: string;
      callerAddress: string;
      callerName: string;
      callType: string;
    };
  };
};

export type AppTabParamList = {
  WalletTab: NavigatorScreenParams<WalletStackParamList>;
  ChatTab: NavigatorScreenParams<MessagesStackParamList>;
  SettingsTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type AuthStackParamList = {
  SocialAuth: undefined;
  UnlockWallet: undefined;
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  TransactionDetails: { id: string } | undefined;
};

export type ContractsStackParamList = {
  ContractsHome: undefined;
  ContractDetail: { id: string } | undefined;
  DocumentCenter: undefined;
  NewContract: undefined;
};

export type WalletStackParamList = {
  WalletHome: undefined;
  SendPayment: {
    prefilledRecipient?: string;
    prefilledAmount?: string;
    prefilledMessage?: string;
    prefilledNetwork?: string;
    prefilledToken?: string;
    returnTo?: "MarketplaceFlow";
    returnParams?: any;
  } | undefined;
  ReceivePayment: undefined;
  TransactionDetails: { id: string } | undefined;
  TreasuryPortal: {
    paymentResult?: {
      success: boolean;
      transactionHash: string;
      amount: string;
      currency: string;
      network: string;
      paymentType?: string;
      stakeAmount?: number;
    };
  } | undefined;
  TreasuryPayment: {
    recipientAddress?: string;
    amount?: string;
    currency?: string;
  } | undefined;
  TradeFinance: undefined;
  CreateInvoice: undefined;
  DocumentCenter: undefined;
  Rewards: undefined;
  TradeFinancePayment: {
    // Old invoice/fee/settlement flow
    paymentType?: "invoice" | "fee" | "settlement" | "collateral" | "issuanceFee" | "balancePayment";
    invoiceAmount?: number;
    supplierAddress?: string;
    invoiceId?: string;
    feeAmount?: number;
    feeRecipient?: string;
    applicationId?: string;
    settlementAmount?: number;
    settlementAddress?: string;
    
    // New PGA payment flow
    pgaId?: string;
    amount?: number;
    collateralAmount?: number;
    guaranteeAmount?: number;
    tradeValue?: number;
    diamondAddress?: string;
    buyerName?: string;
    sellerName?: string;
    description?: string;
    productCategory?: string;
    
    // Common
    preferredToken?: string;
    preferredNetwork?: string;
  };
};

export type MessagesStackParamList = {
  MessagesHome: undefined;
  Chat: {
    contactAddress: string;
    recipientId?: string;
    network?: string;
    fee?: number;
    message?: string;
    tokenAddress?: string;
    tokenDecimals?: number;
    returnTo?: "MarketplaceFlow";
    returnParams?: any;
  };
  Dialer: undefined;
  ContactSelector: {
    callType: 'voice' | 'video';
  };
  IncomingCallScreen: {
    callData: {
      callId: string;
      participantAddress: string;
      participantName: string;
      callType: 'voice' | 'video';
      isIncoming: boolean;
      status: string;
      startTime?: string;
    };
  };
  ActiveCallScreen: {
    callData: {
      callId: string;
      participantAddress: string;
      participantName: string;
      callType: 'voice' | 'video';
      isIncoming: boolean;
      status: string;
    };
    localStream: any | null;
    remoteStream: any | null;
  };
  ReceivePayment: undefined;
  TransactionDetails: { id: string } | undefined;
  CreateInvoice: undefined;
  DocumentCenter: undefined;
  TreasuryPortal: {
    paymentResult?: {
      success: boolean;
      transactionHash: string;
      paymentType: string;
      stakeAmount?: number;
      amount?: string;
      currency?: string;
      network?: string;
    };
  } | undefined;
  TreasuryPayment: {
    paymentType: "stake" | "deposit" | "governance";
    stakeAmount?: number;
    stakingContract?: string;
    stakingPeriod?: string;
    depositAmount?: number;
    depositContract?: string;
    governanceAmount?: number;
    proposalId?: string;
    preferredToken?: string;
    preferredNetwork?: string;
    apy?: number;
    lockPeriod?: number;
  };
  TradeFinance: {
    paymentResult?: {
      success: boolean;
      transactionHash: string;
      paymentType: string;
      applicationId?: string;
      invoiceId?: string;
    };  } | undefined;
  TradeFinancePayment: {
    // Old invoice/fee/settlement flow
    paymentType?: "invoice" | "fee" | "settlement" | "collateral" | "issuanceFee" | "balancePayment";
    invoiceAmount?: number;
    supplierAddress?: string;
    invoiceId?: string;
    feeAmount?: number;
    feeRecipient?: string;
    applicationId?: string;
    settlementAmount?: number;
    settlementAddress?: string;
    
    // New PGA payment flow
    pgaId?: string;
    amount?: number;
    collateralAmount?: number;
    guaranteeAmount?: number;
    tradeValue?: number;
    diamondAddress?: string;
    buyerName?: string;
    sellerName?: string;
    description?: string;
    productCategory?: string;
    
    // Common
    preferredToken?: string;
    preferredNetwork?: string;
  };
  Rewards: undefined;
};

export type TradeStackParamList = {
  TradeHome: undefined;
  TradeFinance: {
    paymentResult?: {
      success: boolean;
      transactionHash: string;
      paymentType: string;
      applicationId?: string;
      invoiceId?: string;
    };
  } | undefined;
  TradeFinancePayment: {
    // Old invoice/fee/settlement flow
    paymentType?: "invoice" | "fee" | "settlement" | "collateral" | "issuanceFee" | "balancePayment";
    invoiceAmount?: number;
    supplierAddress?: string;
    invoiceId?: string;
    feeAmount?: number;
    feeRecipient?: string;
    applicationId?: string;
    settlementAmount?: number;
    settlementAddress?: string;
    
    // New PGA payment flow
    pgaId?: string;
    amount?: number;
    collateralAmount?: number;
    guaranteeAmount?: number;
    tradeValue?: number;
    diamondAddress?: string;
    buyerName?: string;
    sellerName?: string;
    description?: string;
    productCategory?: string;
    
    // Common
    preferredToken?: string;
    preferredNetwork?: string;
  };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  NetworkConfig: undefined;
  Debug: undefined;
};

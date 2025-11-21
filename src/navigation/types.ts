import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  App: undefined;
  BiometricSetup: {
    walletPassword: string;
    returnTo: keyof RootStackParamList;
  };
};

export type AppTabParamList = {
  WalletTab: NavigatorScreenParams<WalletStackParamList>;
  ChatTab: NavigatorScreenParams<MessagesStackParamList>;
  SettingsTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type AuthStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  ImportWallet: undefined;
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
  SendPaymentReview: {
    recipient: string;
    amount: string;
    currency: string;
    network: string;
    fee: number;
    message?: string;
    tokenAddress: string;
    tokenDecimals: number;
    returnTo?: "MarketplaceFlow";
    returnParams?: any;
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
    };
  } | undefined;
  TradeFinancePayment: {
    paymentType: "invoice" | "fee" | "settlement";
    invoiceAmount?: number;
    supplierAddress?: string;
    invoiceId?: string;
    feeAmount?: number;
    feeRecipient?: string;
    applicationId?: string;
    settlementAmount?: number;
    settlementAddress?: string;
    preferredToken?: string;
    preferredNetwork?: string;
  };
  Rewards: undefined;

};

export type MessagesStackParamList = {
  MessagesHome: undefined;
  Chat: { 
    contactAddress: string;
  };
  Calling: {
    contactAddress: string;
    callType: 'voice' | 'video';
    isIncoming: boolean;
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
    paymentType: "invoice" | "fee" | "settlement";
    invoiceAmount?: number;
    supplierAddress?: string;
    invoiceId?: string;
    feeAmount?: number;
    feeRecipient?: string;
    applicationId?: string;
    settlementAmount?: number;
    settlementAddress?: string;
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

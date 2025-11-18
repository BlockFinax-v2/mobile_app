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
  TradeTab: NavigatorScreenParams<TradeStackParamList>;
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
  TreasuryPortal: undefined;
  Rewards: undefined;
  ProfileHome: undefined;
  Settings: undefined;
  NetworkConfig: undefined;
  Debug: undefined;

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
  TradeFinance: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  NetworkConfig: undefined;
  Debug: undefined;
};

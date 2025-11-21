import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['blockfinax://', 'https://blockfinax.app'],
  config: {
    screens: {
      Splash: 'dashboard',
      Auth: {
        screens: {
          Welcome: 'welcome',
          CreateWallet: 'wallet/create',
          ImportWallet: 'wallet/import',
          UnlockWallet: 'wallet/unlock',
        },
      },
      App: {
        screens: {
          DashboardTab: {
            screens: {
              DashboardHome: 'dashboard',
              TransactionDetails: 'transactions/:id',
            },
          },
          ContractsTab: {
            screens: {
              ContractsHome: 'contracts',
              ContractDetail: 'contracts/detail/:id',
              DocumentCenter: 'contracts/documents',
              NewContract: 'contracts/new',
            },
          },
          WalletTab: {
            screens: {
              WalletHome: 'wallet',
              SendPayment: 'wallet/send',
              SendPaymentReview: 'wallet/send/review',
              ReceivePayment: 'wallet/receive',
              TradeFinance: 'wallet/trade-finance',
              TreasuryPortal: 'wallet/treasury',
            },
          },
          ChatTab: {
            screens: {
              MessagesHome: 'messages',
              Chat: 'messages/:id',
            },
          },
          SettingsTab: {
            screens: {
              ProfileHome: 'profile',
              Settings: 'settings',
            },
          },
        },
      },
    },
  },
};

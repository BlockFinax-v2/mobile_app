/**
 * Alchemy Account Kit Configuration - Multi-Chain Support
 * 
 * Comprehensive EVM chain support with USDC as primary transaction token.
 * Designed for easy extension to support additional stablecoins.
 */

import { 
  // Ethereum
  mainnet, sepolia, goerli,
  // Base
  base, baseSepolia,
  // Optimism
  optimism, optimismSepolia,
  // Arbitrum
  arbitrum, arbitrumSepolia,
  // Note: Avalanche, BSC, Lisk not in @account-kit/infra - using custom configs
} from '@account-kit/infra';
import type { Chain } from 'viem';

/**
 * Convert WalletContext network ID to Alchemy network ID
 * WalletContext uses hyphens (e.g., "base-sepolia")
 * Alchemy uses underscores (e.g., "base_sepolia")
 */
export function toAlchemyNetworkId(networkId: string): string {
  return networkId.replace(/-/g, '_');
}

/**
 * Convert Alchemy network ID to WalletContext network ID
 * Alchemy uses underscores (e.g., "base_sepolia")
 * WalletContext uses hyphens (e.g., "base-sepolia")
 */
export function fromAlchemyNetworkId(networkId: string): string {
  return networkId.replace(/_/g, '-');
}

/**
 * Stablecoin Configuration
 * 
 * Defines which stablecoins are supported for transactions across the app.
 * Add new stablecoins here to enable them app-wide.
 */
export const SUPPORTED_STABLECOINS = ['USDC', 'USDT', 'DAI'] as const;
export type SupportedStablecoin = typeof SUPPORTED_STABLECOINS[number];

/**
 * Primary transaction token
 * This is the default token used for all app transactions
 */
export const PRIMARY_TRANSACTION_TOKEN: SupportedStablecoin = 'USDC';

/**
 * Stablecoin contract addresses per network
 * 
 * Format: [network_id]: { USDC: address, USDT: address, DAI: address }
 */
export const STABLECOIN_ADDRESSES: Record<string, Partial<Record<SupportedStablecoin, string>>> = {
  // ========== ETHEREUM ==========
  ethereum_mainnet: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  ethereum_sepolia: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia USDT
    DAI: '0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6',  // Sepolia DAI
  },
  ethereum_goerli: {
    USDC: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
    USDT: '0x509Ee0d083DdF8AC028f2a56731412edD63223B9',
    DAI: '0x73967c6a0904aA032C103b4104747E88c566B1A2',
  },

  // ========== BASE ==========
  base_mainnet: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Native USDC on Base
    // USDbC (Bridged USDC): '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
  },
  base_sepolia: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
  },

  // ========== OPTIMISM ==========
  optimism_mainnet: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Native USDC on Optimism
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  optimism_sepolia: {
    USDC: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia USDC
  },

  // ========== ARBITRUM ==========
  arbitrum_mainnet: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Native USDC on Arbitrum
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  arbitrum_sepolia: {
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia USDC
  },

  // ========== AVALANCHE ==========
  avalanche_mainnet: {
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Native USDC on Avalanche
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
  },
  avalanche_fuji: {
    USDC: '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji USDC
  },

  // ========== BSC (Binance Smart Chain) ==========
  bsc_mainnet: {
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC USDC
    USDT: '0x55d398326f99059fF775485246999027B3197955', // BSC-USD (Binance-Peg)
    DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
  },
  bsc_testnet: {
    USDC: '0x64544969ed7EBf5f083679233325356EbE738930', // BSC Testnet USDC
    USDT: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
  },

  // ========== FANTOM ==========
  fantom_mainnet: {
    USDC: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75', // Bridged USDC
    DAI: '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E',
  },

  // ========== CELO ==========
  celo_mainnet: {
    USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', // Native USDC on Celo
    USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
  },

  // ========== GNOSIS ==========
  gnosis_mainnet: {
    USDC: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83', // USDC on Gnosis
    DAI: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
  },

  // ========== LINEA ==========
  linea_mainnet: {
    USDC: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', // Bridged USDC on Linea
  },

  // ========== SCROLL ==========
  scroll_mainnet: {
    USDC: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4', // Bridged USDC on Scroll
  },

  // ========== ZKSYNC ==========
  zksync_mainnet: {
    USDC: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4', // Native USDC on zkSync
  },

  // ========== LISK ==========
  lisk_mainnet: {
    USDC: '0x05D032ac25d322df992303dCa074EE7392C117b9', // Bridged USDC on Lisk
  },
  lisk_sepolia: {
    USDC: '0x28C2dAfEC0047f4358413Db0E80b2b0B3fDF3462', // Lisk Sepolia USDC
  },
};

/**
 * BSC Chain Configuration
 * BSC is not in @account-kit/infra, so we define it manually
 */
export const bscChain: Chain = {
  id: 56,
  name: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://bsc-dataseed.binance.org'] },
    public: { http: ['https://bsc-dataseed.binance.org'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://bscscan.com' },
  },
};

export const bscTestnetChain: Chain = {
  id: 97,
  name: 'BNB Smart Chain Testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] },
    public: { http: ['https://data-seed-prebsc-1-s1.binance.org:8545'] },
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://testnet.bscscan.com' },
  },
  testnet: true,
};

/**
 * Lisk Chain Configuration
 * Lisk is not in @account-kit/infra, so we define it manually
 */
export const liskChain: Chain = {
  id: 1135,
  name: 'Lisk',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.api.lisk.com'] },
    public: { http: ['https://rpc.api.lisk.com'] },
  },
  blockExplorers: {
    default: { name: 'Lisk Explorer', url: 'https://blockscout.lisk.com' },
  },
};

export const liskSepoliaChain: Chain = {
  id: 4202,
  name: 'Lisk Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia-api.lisk.com'] },
    public: { http: ['https://rpc.sepolia-api.lisk.com'] },
  },
  blockExplorers: {
    default: { name: 'Lisk Sepolia Explorer', url: 'https://sepolia-blockscout.lisk.com' },
  },
  testnet: true,
};

/**
 * Avalanche Chain Configuration
 * Avalanche is not in @account-kit/infra, so we define it manually
 */
export const avalancheChain: Chain = {
  id: 43114,
  name: 'Avalanche C-Chain',
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.avax.network/ext/bc/C/rpc'] },
    public: { http: ['https://api.avax.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'SnowTrace', url: 'https://snowtrace.io' },
  },
};

export const avalancheFujiChain: Chain = {
  id: 43113,
  name: 'Avalanche Fuji',
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
    public: { http: ['https://api.avax-test.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'SnowTrace', url: 'https://testnet.snowtrace.io' },
  },
  testnet: true,
};

/**
 * Network configurations for Alchemy
 * Maps our internal network names to Alchemy chain configurations
 */
export const ALCHEMY_CHAINS: Record<string, Chain> = {
  // Ethereum
  ethereum_mainnet: mainnet,
  ethereum_sepolia: sepolia,
  ethereum_goerli: goerli,
  
  // Base
  base_mainnet: base,
  base_sepolia: baseSepolia,
  
  // Optimism
  optimism_mainnet: optimism,
  optimism_sepolia: optimismSepolia,
  
  // Arbitrum
  arbitrum_mainnet: arbitrum,
  arbitrum_sepolia: arbitrumSepolia,
  
  // Avalanche (Custom)
  avalanche_mainnet: avalancheChain,
  avalanche_fuji: avalancheFujiChain,
  
  // BSC (Custom)
  bsc_mainnet: bscChain,
  bsc_testnet: bscTestnetChain,
  
  // Lisk (Custom)
  lisk_mainnet: liskChain,
  lisk_sepolia: liskSepoliaChain,
};

/**
 * Supported networks for Alchemy AA
 */
export const SUPPORTED_ALCHEMY_NETWORKS = Object.keys(ALCHEMY_CHAINS);
export type SupportedAlchemyNetwork = keyof typeof ALCHEMY_CHAINS;

/**
 * Check if a network is supported by Alchemy AA SDK
 */
export function isAlchemyNetworkSupported(network: string): network is SupportedAlchemyNetwork {
  const alchemyNetworkId = toAlchemyNetworkId(network);
  return alchemyNetworkId in ALCHEMY_CHAINS;
}

/**
 * Get Alchemy chain configuration for a network
 */
export function getAlchemyChain(network: string): Chain {
  const alchemyNetworkId = toAlchemyNetworkId(network);
  if (!isAlchemyNetworkSupported(network)) {
    throw new Error(`Network ${network} is not supported by Alchemy`);
  }
  return ALCHEMY_CHAINS[alchemyNetworkId];
}

/**
 * Get stablecoin address for a specific network
 * 
 * @param network - Network ID
 * @param stablecoin - Stablecoin symbol (defaults to USDC)
 * @returns Contract address or undefined if not available
 */
export function getStablecoinAddress(
  network: string,
  stablecoin: SupportedStablecoin = PRIMARY_TRANSACTION_TOKEN
): string | undefined {
  const alchemyNetworkId = toAlchemyNetworkId(network);
  return STABLECOIN_ADDRESSES[alchemyNetworkId]?.[stablecoin];
}

/**
 * Get all available stablecoins for a network
 * 
 * @param network - Network ID
 * @returns Array of available stablecoins with addresses
 */
export function getAvailableStablecoins(network: string): Array<{
  symbol: SupportedStablecoin;
  address: string;
  decimals: number;
}> {
  const networkStablecoins = STABLECOIN_ADDRESSES[network];
  if (!networkStablecoins) return [];
  
  // Standard decimals for each stablecoin
  const STABLECOIN_DECIMALS: Record<SupportedStablecoin, number> = {
    USDC: 6,
    USDT: 6,
    DAI: 18,
  };
  
  return Object.entries(networkStablecoins)
    .filter(([_, address]) => address !== undefined)
    .map(([symbol, address]) => ({
      symbol: symbol as SupportedStablecoin,
      address: address!,
      decimals: STABLECOIN_DECIMALS[symbol as SupportedStablecoin],
    }));
}

/**
 * Check if a stablecoin is supported for transactions on a network
 * 
 * @param network - Network ID
 * @param stablecoin - Stablecoin symbol
 * @returns true if supported for transactions
 */
export function isStablecoinSupportedForTransactions(
  network: string,
  stablecoin: SupportedStablecoin
): boolean {
  return getStablecoinAddress(network, stablecoin) !== undefined;
}

/**
 * Get primary transaction token address for a network
 * This is the default token used for all app transactions
 */
export function getPrimaryTransactionTokenAddress(network: string): string | undefined {
  return getStablecoinAddress(network, PRIMARY_TRANSACTION_TOKEN);
}

/**
 * Get Alchemy API key from environment
 */
export function getAlchemyApiKey(): string {
  const apiKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;
  if (!apiKey) {
    console.error('[AlchemyConfig] EXPO_PUBLIC_ALCHEMY_API_KEY is not set!');
    console.error('[AlchemyConfig] Please add your Alchemy API key to .env file');
    console.error('[AlchemyConfig] Get your API key from: https://dashboard.alchemy.com/');
    throw new Error('EXPO_PUBLIC_ALCHEMY_API_KEY is not set in environment variables');
  }
  if (apiKey === 'your_alchemy_api_key_here') {
    console.error('[AlchemyConfig] Please replace the example API key with your actual Alchemy API key');
    throw new Error('Invalid Alchemy API key - please use a real API key from dashboard.alchemy.com');
  }
  console.log('[AlchemyConfig] Alchemy API key loaded:', apiKey.substring(0, 8) + '...');
  return apiKey;
}

/**
 * Get Alchemy Gas Policy ID from environment (optional)
 */
export function getAlchemyGasPolicyId(): string | undefined {
  return process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID;
}

/**
 * Network-specific configurations
 */
export const NETWORK_CONFIGS: Record<string, {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  isTestnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}> = {
  // Ethereum
  ethereum_mainnet: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    explorerUrl: 'https://etherscan.io',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  ethereum_sepolia: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/',
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },
  ethereum_goerli: {
    name: 'Ethereum Goerli',
    chainId: 5,
    rpcUrl: 'https://eth-goerli.g.alchemy.com/v2/',
    explorerUrl: 'https://goerli.etherscan.io',
    isTestnet: true,
    nativeCurrency: { name: 'Goerli Ether', symbol: 'ETH', decimals: 18 },
  },

  // Base
  base_mainnet: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/',
    explorerUrl: 'https://basescan.org',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  base_sepolia: {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/',
    explorerUrl: 'https://sepolia.basescan.org',
    isTestnet: true,
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },

  // Optimism
  optimism_mainnet: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/',
    explorerUrl: 'https://optimistic.etherscan.io',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  optimism_sepolia: {
    name: 'Optimism Sepolia',
    chainId: 11155420,
    rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2/',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    isTestnet: true,
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },

  // Arbitrum
  arbitrum_mainnet: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/',
    explorerUrl: 'https://arbiscan.io',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  arbitrum_sepolia: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/',
    explorerUrl: 'https://sepolia.arbiscan.io',
    isTestnet: true,
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },

  // Avalanche
  avalanche_mainnet: {
    name: 'Avalanche C-Chain',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    isTestnet: false,
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  },
  avalanche_fuji: {
    name: 'Avalanche Fuji',
    chainId: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    isTestnet: true,
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  },

  // BSC
  bsc_mainnet: {
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    isTestnet: false,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  },
  bsc_testnet: {
    name: 'BSC Testnet',
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
    isTestnet: true,
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  },

  // Lisk
  lisk_mainnet: {
    name: 'Lisk',
    chainId: 1135,
    rpcUrl: 'https://rpc.api.lisk.com',
    explorerUrl: 'https://blockscout.lisk.com',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  lisk_sepolia: {
    name: 'Lisk Sepolia',
    chainId: 4202,
    rpcUrl: 'https://rpc.sepolia-api.lisk.com',
    explorerUrl: 'https://sepolia-blockscout.lisk.com',
    isTestnet: true,
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  },
};

/**
 * Get network configuration
 */
export function getNetworkConfig(network: string) {
  const config = NETWORK_CONFIGS[network];
  if (!config) {
    throw new Error(`Network ${network} configuration not found`);
  }
  return config;
}

/**
 * Entry Point address for ERC-4337 v0.7
 */
export const ENTRY_POINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

/**
 * Helper: Get all mainnet networks
 */
export function getMainnetNetworks(): string[] {
  return Object.entries(NETWORK_CONFIGS)
    .filter(([_, config]) => !config.isTestnet)
    .map(([id]) => id);
}

/**
 * Helper: Get all testnet networks
 */
export function getTestnetNetworks(): string[] {
  return Object.entries(NETWORK_CONFIGS)
    .filter(([_, config]) => config.isTestnet)
    .map(([id]) => id);
}

/**
 * Helper: Check if network supports USDC transactions
 */
export function supportsUSDCTransactions(network: string): boolean {
  return getStablecoinAddress(network, 'USDC') !== undefined;
}

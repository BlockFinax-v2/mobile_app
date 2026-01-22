/**
 * Stablecoin Price Oracle
 * 
 * Provides USD conversion rates for various stablecoins across networks.
 * Uses on-chain price feeds (Chainlink) and fallback to API prices.
 */

import { ethers } from 'ethers';

// Chainlink Price Feed ABI (simplified)
const PRICE_FEED_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)',
];

/**
 * Stablecoin configuration with price feeds
 */
export interface StablecoinConfig {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  priceFeedAddress?: string; // Chainlink price feed
  targetPeg: number; // Target peg in USD (usually 1.0)
}

/**
 * Network-specific stablecoin configurations
 */
export const NETWORK_STABLECOINS: Record<number, StablecoinConfig[]> = {
  // Lisk Mainnet
  1135: [
    {
      symbol: 'USDC',
      name: 'USD Coin (Bridged)',
      address: '0xF242275d3a6527d877f2c927a82D9b057609cc71',
      decimals: 6,
      targetPeg: 1.0,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x05D64748c8920c2eAaD5a3068b5f6408bC033b24', // Fixed USDT address
      decimals: 6,
      targetPeg: 1.0,
    },
  ],

  // Lisk Sepolia (Testnet)
  4202: [
    {
      symbol: 'USDC',
      name: 'USD Coin (Test)',
      address: '0x17b3531549F842552911CB287CCf7a5F328ff7d1',
      decimals: 6,
      targetPeg: 1.0,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD (Test)',
      address: '0xa3f3aA5B62237961AF222B211477e572149EBFAe',
      decimals: 6,
      targetPeg: 1.0,
    },
  ],
  
  // Ethereum Mainnet
  1: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      priceFeedAddress: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
      targetPeg: 1.0,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      priceFeedAddress: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
      targetPeg: 1.0,
    },
  ],

  // Ethereum Sepolia (Testnet)
  11155111: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: 6,
      priceFeedAddress: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E',
      targetPeg: 1.0,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD (Test)',
      address: '0x523C8591Fbe215B5aF0bEad65e65dF783A37BCBC',
      decimals: 6,
      targetPeg: 1.0,
    },
  ],

  // Base Mainnet
  8453: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      priceFeedAddress: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
      targetPeg: 1.0,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      decimals: 6,
      targetPeg: 1.0,
    },
  ],

  // Base Sepolia (Testnet)
  84532: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      decimals: 6,
      targetPeg: 1.0,
    },
    // USDT temporarily removed - contract not deployed/working on Base Sepolia
  ],
};

/**
 * Price cache to avoid frequent on-chain calls
 */
class PriceCache {
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly TTL = 60000; // 1 minute cache

  set(key: string, price: number): void {
    this.cache.set(key, { price, timestamp: Date.now() });
  }

  get(key: string): number | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.price;
  }
}

const priceCache = new PriceCache();

/**
 * Get stablecoin price in USD using Chainlink or fallback
 */
export async function getStablecoinPriceUSD(
  chainId: number,
  tokenAddress: string,
  provider: ethers.providers.Provider
): Promise<number> {
  const cacheKey = `${chainId}:${tokenAddress.toLowerCase()}`;
  
  // Check cache first
  const cachedPrice = priceCache.get(cacheKey);
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  // Find token config
  const networkTokens = NETWORK_STABLECOINS[chainId] || [];
  const tokenConfig = networkTokens.find(
    t => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );

  if (!tokenConfig) {
    console.warn(`Unknown stablecoin: ${tokenAddress} on chain ${chainId}`);
    return 1.0; // Assume $1 for unknown stablecoins
  }

  try {
    // Try Chainlink price feed if available
    if (tokenConfig.priceFeedAddress) {
      const priceFeed = new ethers.Contract(
        tokenConfig.priceFeedAddress,
        PRICE_FEED_ABI,
        provider
      );

      const [decimals, roundData] = await Promise.all([
        priceFeed.decimals(),
        priceFeed.latestRoundData(),
      ]);

      const price = Number(roundData.answer) / Math.pow(10, decimals);
      
      // Cache and return
      priceCache.set(cacheKey, price);
      return price;
    }

    // Fallback to target peg for stablecoins
    priceCache.set(cacheKey, tokenConfig.targetPeg);
    return tokenConfig.targetPeg;
  } catch (error) {
    console.error('Failed to fetch price from Chainlink:', error);
    
    // Fallback to target peg
    priceCache.set(cacheKey, tokenConfig.targetPeg);
    return tokenConfig.targetPeg;
  }
}

/**
 * Simplified convertToUSD - for stablecoins, price is typically $1.00
 * @param amount - Token amount (already in human-readable format)
 * @param symbolOrAddress - Token symbol (e.g., 'USDC') or address
 * @param chainId - Network chain ID
 * @returns USD value (amount * price, typically amount * 1.0 for stablecoins)
 */
export async function convertToUSD(
  amount: string | number,
  symbolOrAddress: string,
  chainId: number
): Promise<number> {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // For stablecoins, we assume 1:1 peg unless we have a price feed
  // Check if it's a symbol or address
  const isAddress = symbolOrAddress.startsWith('0x');
  
  if (isAddress) {
    // Find token by address
    const networkTokens = NETWORK_STABLECOINS[chainId] || [];
    const tokenConfig = networkTokens.find(
      t => t.address.toLowerCase() === symbolOrAddress.toLowerCase()
    );
    
    if (!tokenConfig) {
      console.warn(`Unknown stablecoin address: ${symbolOrAddress} on chain ${chainId}`);
      return amountNum; // Assume 1:1 for unknown stablecoins
    }
    
    // Use target peg (typically 1.0 for stablecoins)
    return amountNum * tokenConfig.targetPeg;
  } else {
    // Find token by symbol
    const networkTokens = NETWORK_STABLECOINS[chainId] || [];
    const tokenConfig = networkTokens.find(
      t => t.symbol === symbolOrAddress
    );
    
    if (!tokenConfig) {
      console.warn(`Unknown stablecoin symbol: ${symbolOrAddress} on chain ${chainId}`);
      return amountNum; // Assume 1:1 for unknown stablecoins
    }
    
    // Use target peg (typically 1.0 for stablecoins)
    return amountNum * tokenConfig.targetPeg;
  }
}

/**
 * Advanced convertToUSD with Chainlink price feeds
 * Use this when you need real-time pricing from oracles
 */
export async function convertToUSDWithOracle(
  amount: string | number,
  tokenDecimals: number,
  chainId: number,
  tokenAddress: string,
  provider: ethers.providers.Provider
): Promise<number> {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Get price from Chainlink or fallback
  const priceUSD = await getStablecoinPriceUSD(chainId, tokenAddress, provider);
  
  // Convert: amount * price
  return amountNum * priceUSD;
}

/**
 * Convert USD amount to stablecoin equivalent
 */
export async function convertFromUSD(
  usdAmount: number,
  tokenDecimals: number,
  chainId: number,
  tokenAddress: string,
  provider: ethers.providers.Provider
): Promise<string> {
  const priceUSD = await getStablecoinPriceUSD(chainId, tokenAddress, provider);
  
  // Convert: usdAmount / price
  const tokenAmount = usdAmount / priceUSD;
  
  return tokenAmount.toFixed(tokenDecimals);
}

/**
 * Get all supported stablecoins for a network
 */
export function getSupportedStablecoins(chainId: number): StablecoinConfig[] {
  return NETWORK_STABLECOINS[chainId] || [];
}

/**
 * Check if a token is a supported stablecoin
 */
export function isSupportedStablecoin(chainId: number, tokenAddress: string): boolean {
  const tokens = NETWORK_STABLECOINS[chainId] || [];
  return tokens.some(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
}

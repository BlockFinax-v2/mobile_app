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
  // Lisk Sepolia (Testnet)
  4202: [
    {
      symbol: 'USDC',
      name: 'USD Coin (Bridged)',
      address: '0x0E82fDDAd51cc3ac12b69761C45bBCB9A2Bf3C83',
      decimals: 6,
      targetPeg: 1.0,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD (Bridged)',
      address: '0x7E2db2968f80E5cACFB0bd93C724d0447a6b6D8c', // Common testnet USDT
      decimals: 6,
      targetPeg: 1.0,
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin (Bridged)',
      address: '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa', // Common testnet DAI
      decimals: 18,
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
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      decimals: 18,
      priceFeedAddress: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
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
      name: 'Tether USD',
      address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia USDT faucet token
      decimals: 6,
      targetPeg: 1.0,
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // Sepolia DAI
      decimals: 18,
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
      symbol: 'USDbC',
      name: 'USD Base Coin',
      address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      decimals: 6,
      targetPeg: 1.0,
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      decimals: 18,
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
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xf3e622265cad2C68330A46346d6E2C4Bde19A251', // Base Sepolia USDT
      decimals: 6,
      targetPeg: 1.0,
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // Base Sepolia DAI
      decimals: 18,
      targetPeg: 1.0,
    },
  ],

  // BSC Mainnet
  56: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      decimals: 18,
      priceFeedAddress: '0x51597f405303C4377E36123cBc172b13269EA163',
      targetPeg: 1.0,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
      priceFeedAddress: '0xB97Ad0E74fa7d920791E90258A6E2085088b4320',
      targetPeg: 1.0,
    },
    {
      symbol: 'BUSD',
      name: 'Binance USD',
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      decimals: 18,
      targetPeg: 1.0,
    },
  ],

  // BSC Testnet
  97: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x64544969ed7EBf5f083679233325356EbE738930', // BSC Testnet USDC
      decimals: 18,
      targetPeg: 1.0,
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // BSC Testnet USDT
      decimals: 18,
      targetPeg: 1.0,
    },
    {
      symbol: 'BUSD',
      name: 'Binance USD',
      address: '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee', // BSC Testnet BUSD
      decimals: 18,
      targetPeg: 1.0,
    },
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

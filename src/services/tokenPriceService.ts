/**
 * Token Price Service
 * 
 * Simple token price estimation for gasless limit calculations.
 * Uses hardcoded/cached prices for quick estimation.
 */

export interface TokenPrice {
  symbol: string;
  usdPrice: number;
  lastUpdated: number;
}

// Approximate prices - in production, fetch from price oracle/API
const PRICE_ESTIMATES: Record<string, number> = {
  // Stablecoins
  'USDC': 1.0,
  'USDT': 1.0,
  'DAI': 1.0,
  
  // Major cryptocurrencies (approximate)
  'ETH': 3500,
  'BTC': 42000,
  'BNB': 300,
  'MATIC': 0.8,
  'LSK': 1.2,
  
  // Default for unknown tokens
  'DEFAULT': 1.0,
};

class TokenPriceService {
  private static instance: TokenPriceService;

  public static getInstance(): TokenPriceService {
    if (!TokenPriceService.instance) {
      TokenPriceService.instance = new TokenPriceService();
    }
    return TokenPriceService.instance;
  }

  /**
   * Get token price in USD
   */
  public getTokenPrice(symbol: string): number {
    return PRICE_ESTIMATES[symbol.toUpperCase()] || PRICE_ESTIMATES.DEFAULT;
  }

  /**
   * Convert token amount to USD
   */
  public convertToUSD(amount: number, tokenSymbol: string): number {
    const price = this.getTokenPrice(tokenSymbol);
    return amount * price;
  }

  /**
   * Convert USD to token amount
   */
  public convertFromUSD(usdAmount: number, tokenSymbol: string): number {
    const price = this.getTokenPrice(tokenSymbol);
    return price > 0 ? usdAmount / price : 0;
  }

  /**
   * Update token price (for future API integration)
   */
  public updatePrice(symbol: string, usdPrice: number): void {
    PRICE_ESTIMATES[symbol.toUpperCase()] = usdPrice;
  }
}

export const tokenPriceService = TokenPriceService.getInstance();

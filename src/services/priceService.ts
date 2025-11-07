import { WalletNetwork } from '@/contexts/WalletContext';

interface TokenPrice {
  symbol: string;
  price: number;
  change24h?: number;
  lastUpdated: Date;
}

interface PriceResponse {
  [key: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

class PriceService {
  private cache = new Map<string, TokenPrice>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Get token prices from CoinGecko API
   */
  async getTokenPrices(symbols: string[]): Promise<Map<string, TokenPrice>> {
    const prices = new Map<string, TokenPrice>();
    
    // Check cache first
    const uncachedSymbols: string[] = [];
    for (const symbol of symbols) {
      const cached = this.cache.get(symbol.toLowerCase());
      if (cached && Date.now() - cached.lastUpdated.getTime() < this.cacheTimeout) {
        prices.set(symbol, cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    if (uncachedSymbols.length === 0) {
      return prices;
    }

    try {
      // Map symbols to CoinGecko IDs
      const coinIds = this.mapSymbolsToCoinIds(uncachedSymbols);
      const idsParam = coinIds.join(',');
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: PriceResponse = await response.json();

      // Process the response
      for (let i = 0; i < coinIds.length; i++) {
        const coinId = coinIds[i];
        const symbol = uncachedSymbols[i];
        const priceData = data[coinId];

        if (priceData) {
          const tokenPrice: TokenPrice = {
            symbol,
            price: priceData.usd,
            change24h: priceData.usd_24h_change,
            lastUpdated: new Date(),
          };

          prices.set(symbol, tokenPrice);
          this.cache.set(symbol.toLowerCase(), tokenPrice);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch prices from CoinGecko:', error);
      
      // Fallback to approximate prices for common tokens
      const fallbackPrices = this.getFallbackPrices();
      for (const symbol of uncachedSymbols) {
        const fallbackPrice = fallbackPrices[symbol.toLowerCase()];
        if (fallbackPrice) {
          const tokenPrice: TokenPrice = {
            symbol,
            price: fallbackPrice,
            lastUpdated: new Date(),
          };
          prices.set(symbol, tokenPrice);
        }
      }
    }

    return prices;
  }

  /**
   * Calculate USD value for token balances
   */
  async calculateUSDValue(
    symbol: string,
    balance: string | number,
    network?: WalletNetwork
  ): Promise<number> {
    const numericBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
    
    if (isNaN(numericBalance) || numericBalance === 0) {
      return 0;
    }

    const prices = await this.getTokenPrices([symbol]);
    const tokenPrice = prices.get(symbol);

    if (tokenPrice) {
      return numericBalance * tokenPrice.price;
    }

    // Fallback for stablecoins
    if (this.isStablecoin(symbol)) {
      return numericBalance; // Assume $1 for stablecoins
    }

    return 0;
  }

  /**
   * Map token symbols to CoinGecko coin IDs
   */
  private mapSymbolsToCoinIds(symbols: string[]): string[] {
    const symbolMap: { [key: string]: string } = {
      'eth': 'ethereum',
      'matic': 'matic-network',
      'bnb': 'binancecoin',
      'usdc': 'usd-coin',
      'usdt': 'tether',
      'dai': 'dai',
      'usdb': 'usd-base-coin',
      'usdbc': 'usd-base-coin',
    };

    return symbols.map(symbol => 
      symbolMap[symbol.toLowerCase()] || symbol.toLowerCase()
    );
  }

  /**
   * Fallback prices when API fails
   */
  private getFallbackPrices(): { [key: string]: number } {
    return {
      'eth': 2500,
      'matic': 0.45,
      'bnb': 240,
      'usdc': 1.00,
      'usdt': 1.00,
      'dai': 1.00,
      'usdb': 1.00,
      'usdbc': 1.00,
    };
  }

  /**
   * Check if a token is a stablecoin
   */
  private isStablecoin(symbol: string): boolean {
    const stablecoins = ['usdc', 'usdt', 'dai', 'usdb', 'usdbc', 'busd', 'tusd'];
    return stablecoins.includes(symbol.toLowerCase());
  }

  /**
   * Clear price cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached prices (for debugging)
   */
  getCachedPrices(): Map<string, TokenPrice> {
    return new Map(this.cache);
  }
}

export const priceService = new PriceService();
export type { TokenPrice };
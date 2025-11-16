import { priceService } from '@/services/priceService';
import { SupportedNetworkId, getStablecoinsForNetwork } from '@/contexts/WalletContext';

interface ConversionResult {
  fromAmount: number;
  toAmount: number;
  fromSymbol: string;
  toSymbol: string;
  rate: number;
  usdValue: number;
}

export class CurrencyConverter {
  
  /**
   * Convert amount from one token to another based on USD rates
   * @param amount Amount to convert
   * @param fromSymbol Source token symbol
   * @param toSymbol Target token symbol
   * @param networkId Network ID for context
   */
  async convertAmount(
    amount: number,
    fromSymbol: string,
    toSymbol: string,
    networkId?: SupportedNetworkId
  ): Promise<ConversionResult> {
    
    if (amount <= 0) {
      return {
        fromAmount: 0,
        toAmount: 0,
        fromSymbol,
        toSymbol,
        rate: 0,
        usdValue: 0,
      };
    }

    // If same symbol, return as-is
    if (fromSymbol.toLowerCase() === toSymbol.toLowerCase()) {
      return {
        fromAmount: amount,
        toAmount: amount,
        fromSymbol,
        toSymbol,
        rate: 1,
        usdValue: await priceService.calculateUSDValue(fromSymbol, amount),
      };
    }

    try {
      // Get prices for both tokens
      const prices = await priceService.getTokenPrices([fromSymbol, toSymbol]);
      const fromPrice = prices.get(fromSymbol);
      const toPrice = prices.get(toSymbol);

      if (!fromPrice || !toPrice) {
        throw new Error(`Price not available for ${!fromPrice ? fromSymbol : toSymbol}`);
      }

      // Calculate conversion
      const usdValue = amount * fromPrice.price;
      const convertedAmount = usdValue / toPrice.price;
      const rate = fromPrice.price / toPrice.price;

      return {
        fromAmount: amount,
        toAmount: convertedAmount,
        fromSymbol,
        toSymbol,
        rate,
        usdValue,
      };

    } catch (error) {
      console.warn('Currency conversion failed:', error);
      
      // Fallback logic
      return this.getFallbackConversion(amount, fromSymbol, toSymbol);
    }
  }

  /**
   * Convert native token amount to preferred stablecoin
   * @param amount Amount in native token
   * @param networkId Network ID
   * @param preferredStablecoin Preferred stablecoin (defaults to USDC)
   */
  async convertToStablecoin(
    amount: number,
    networkId: SupportedNetworkId,
    preferredStablecoin: string = 'USDC'
  ): Promise<ConversionResult> {
    const nativeSymbol = this.getNativeTokenSymbol(networkId);
    
    // Check if preferred stablecoin is available on network
    const stablecoins = getStablecoinsForNetwork(networkId);
    const targetStablecoin = stablecoins.find(
      coin => coin.symbol.toLowerCase() === preferredStablecoin.toLowerCase()
    );

    const targetSymbol = targetStablecoin?.symbol || 'USDC';
    
    return this.convertAmount(amount, nativeSymbol, targetSymbol, networkId);
  }

  /**
   * Convert stablecoin amount to native token
   * @param amount Amount in stablecoin
   * @param networkId Network ID
   * @param stablecoinSymbol Stablecoin symbol (defaults to USDC)
   */
  async convertFromStablecoin(
    amount: number,
    networkId: SupportedNetworkId,
    stablecoinSymbol: string = 'USDC'
  ): Promise<ConversionResult> {
    const nativeSymbol = this.getNativeTokenSymbol(networkId);
    
    return this.convertAmount(amount, stablecoinSymbol, nativeSymbol, networkId);
  }

  /**
   * Calculate trading fee in both native token and USD
   * @param amount Trade amount
   * @param tokenSymbol Token symbol
   * @param feePercentage Fee percentage (e.g., 0.2 for 0.2%)
   * @param networkId Network ID
   */
  async calculateTradingFee(
    amount: number,
    tokenSymbol: string,
    feePercentage: number,
    networkId?: SupportedNetworkId
  ): Promise<{
    feeAmount: number;
    feeSymbol: string;
    feeUSD: number;
    totalAmount: number;
    totalUSD: number;
  }> {
    const feeAmount = (amount * feePercentage) / 100;
    const totalAmount = amount + feeAmount;

    const [feeUSD, totalUSD] = await Promise.all([
      priceService.calculateUSDValue(tokenSymbol, feeAmount),
      priceService.calculateUSDValue(tokenSymbol, totalAmount),
    ]);

    return {
      feeAmount,
      feeSymbol: tokenSymbol,
      feeUSD,
      totalAmount,
      totalUSD,
    };
  }

  /**
   * Get real-time conversion rate between two tokens
   * @param fromSymbol Source token
   * @param toSymbol Target token
   */
  async getConversionRate(
    fromSymbol: string, 
    toSymbol: string
  ): Promise<number> {
    if (fromSymbol.toLowerCase() === toSymbol.toLowerCase()) {
      return 1;
    }

    try {
      const prices = await priceService.getTokenPrices([fromSymbol, toSymbol]);
      const fromPrice = prices.get(fromSymbol);
      const toPrice = prices.get(toSymbol);

      if (!fromPrice || !toPrice) {
        return 0;
      }

      return fromPrice.price / toPrice.price;
    } catch (error) {
      console.warn('Failed to get conversion rate:', error);
      return 0;
    }
  }

  /**
   * Format currency amount for display
   * @param amount Amount to format
   * @param symbol Token symbol
   * @param decimals Number of decimal places
   */
  formatAmount(
    amount: number, 
    symbol: string, 
    decimals: number = 6
  ): string {
    if (amount === 0) return `0 ${symbol}`;
    
    // For very small amounts, show more decimals
    if (amount < 0.001) {
      return `${amount.toExponential(2)} ${symbol}`;
    }
    
    // For stablecoins, show 2 decimals
    if (this.isStablecoin(symbol)) {
      return `${amount.toFixed(2)} ${symbol}`;
    }
    
    // For other tokens, show appropriate decimals based on amount
    const displayDecimals = amount >= 1 ? 4 : 6;
    return `${amount.toFixed(Math.min(decimals, displayDecimals))} ${symbol}`;
  }

  /**
   * Format USD amount for display
   */
  formatUSD(amount: number): string {
    if (amount === 0) return '$0.00';
    if (amount < 0.01) return '< $0.01';
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(2)}K`;
    }
    return `$${amount.toFixed(2)}`;
  }

  /**
   * Get native token symbol for network
   */
  private getNativeTokenSymbol(networkId: SupportedNetworkId): string {
    if (networkId.includes('ethereum')) return 'ETH';
    if (networkId.includes('polygon')) return 'MATIC';
    if (networkId.includes('bsc')) return 'BNB';
    if (networkId.includes('base')) return 'ETH';
    if (networkId.includes('lisk')) return 'ETH';
    return 'ETH'; // Default fallback
  }

  /**
   * Check if token is a stablecoin
   */
  private isStablecoin(symbol: string): boolean {
    const stablecoins = ['USDC', 'USDT', 'DAI', 'USDB', 'USDBC', 'BUSD', 'TUSD'];
    return stablecoins.includes(symbol.toUpperCase());
  }

  /**
   * Fallback conversion when API fails
   */
  private getFallbackConversion(
    amount: number,
    fromSymbol: string,
    toSymbol: string
  ): ConversionResult {
    // Simple fallback rates (approximate)
    const fallbackRates: { [key: string]: number } = {
      'ETH': 2500,
      'MATIC': 0.45,
      'BNB': 240,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1,
    };

    const fromRate = fallbackRates[fromSymbol.toUpperCase()] || 1;
    const toRate = fallbackRates[toSymbol.toUpperCase()] || 1;
    
    const rate = fromRate / toRate;
    const convertedAmount = amount * rate;
    const usdValue = amount * fromRate;

    return {
      fromAmount: amount,
      toAmount: convertedAmount,
      fromSymbol,
      toSymbol,
      rate,
      usdValue,
    };
  }
}

// Export singleton instance
export const currencyConverter = new CurrencyConverter();
export type { ConversionResult };
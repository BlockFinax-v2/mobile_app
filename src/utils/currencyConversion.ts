import { priceService } from "@/services/priceService";
import { WalletNetwork } from "@/contexts/WalletContext";

export interface CurrencyConversion {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  rate: number;
  network: WalletNetwork;
}

export class CurrencyConversionService {
  /**
   * Convert USD amount to the equivalent amount in the selected network's native token
   */
  async convertUsdToNativeToken(
    usdAmount: number,
    network: WalletNetwork
  ): Promise<CurrencyConversion> {
    try {
      const priceMap = await priceService.getTokenPrices([network.primaryCurrency]);
      const tokenPrice = priceMap.get(network.primaryCurrency);
      
      if (!tokenPrice || tokenPrice.price <= 0) {
        throw new Error(`Unable to get price for ${network.primaryCurrency}`);
      }

      const convertedAmount = usdAmount / tokenPrice.price;
      
      return {
        amount: usdAmount,
        fromCurrency: "USD",
        toCurrency: network.primaryCurrency,
        convertedAmount,
        rate: tokenPrice.price,
        network,
      };
    } catch (error) {
      console.error("Error converting USD to native token:", error);
      throw error;
    }
  }

  /**
   * Convert native token amount to USD equivalent
   */
  async convertNativeTokenToUsd(
    tokenAmount: number,
    network: WalletNetwork
  ): Promise<CurrencyConversion> {
    try {
      const priceMap = await priceService.getTokenPrices([network.primaryCurrency]);
      const tokenPrice = priceMap.get(network.primaryCurrency);
      
      if (!tokenPrice || tokenPrice.price <= 0) {
        throw new Error(`Unable to get price for ${network.primaryCurrency}`);
      }

      const convertedAmount = tokenAmount * tokenPrice.price;
      
      return {
        amount: tokenAmount,
        fromCurrency: network.primaryCurrency,
        toCurrency: "USD",
        convertedAmount,
        rate: tokenPrice.price,
        network,
      };
    } catch (error) {
      console.error("Error converting native token to USD:", error);
      throw error;
    }
  }

  /**
   * Convert between any two tokens on the same network
   */
  async convertBetweenTokens(
    amount: number,
    fromSymbol: string,
    toSymbol: string,
    network: WalletNetwork
  ): Promise<CurrencyConversion> {
    try {
      // If converting to/from USD, use direct conversion
      if (fromSymbol === "USD") {
        return this.convertUsdToNativeToken(amount, network);
      }
      if (toSymbol === "USD") {
        return this.convertNativeTokenToUsd(amount, network);
      }

      // For token-to-token conversion, go through USD
      const priceMap = await priceService.getTokenPrices([fromSymbol, toSymbol]);
      const fromTokenPrice = priceMap.get(fromSymbol);
      const toTokenPrice = priceMap.get(toSymbol);
      
      if (!fromTokenPrice || !toTokenPrice || fromTokenPrice.price <= 0 || toTokenPrice.price <= 0) {
        throw new Error(`Unable to get prices for ${fromSymbol} or ${toSymbol}`);
      }

      const usdValue = amount * fromTokenPrice.price;
      const convertedAmount = usdValue / toTokenPrice.price;
      const rate = fromTokenPrice.price / toTokenPrice.price;
      
      return {
        amount,
        fromCurrency: fromSymbol,
        toCurrency: toSymbol,
        convertedAmount,
        rate,
        network,
      };
    } catch (error) {
      console.error("Error converting between tokens:", error);
      throw error;
    }
  }

  /**
   * Format currency amount with appropriate decimals (BigNumber-safe)
   */
  formatAmount(amount: number, symbol: string): string {
    if (symbol === "USD") {
      return amount.toFixed(2);
    }
    
    // For crypto tokens, use BigNumber-safe formatting with regex truncation
    // This prevents floating point precision issues that cause BigNumber errors
    let decimals: number;
    if (amount < 0.000001) {
      decimals = 18; // Very small amounts
    } else if (amount < 1) {
      decimals = 8; // Small amounts
    } else if (amount < 1000) {
      decimals = 4; // Medium amounts
    } else {
      decimals = 2; // Large amounts
    }
    
    // Use regex to truncate decimal places instead of toFixed to avoid rounding errors
    const amountStr = amount.toString();
    const regex = new RegExp(`^\\d+(\\.\\d{0,${decimals}})?`);
    const match = amountStr.match(regex);
    const formatted = match ? match[0] : amountStr;
    
    // Ensure we don't have trailing zeros that might cause issues
    return parseFloat(formatted).toString();
  }

  /**
   * Format amount specifically for BigNumber parsing (transaction-safe)
   */
  formatAmountForTransaction(amount: number, symbol: string): string {
    if (symbol === "USD") {
      return amount.toFixed(2);
    }
    
    // For crypto transactions, use conservative formatting
    // Limit to 6 decimal places to avoid BigNumber precision issues
    const maxDecimals = 6;
    
    // Convert to string and use regex to truncate
    const amountStr = amount.toString();
    const regex = new RegExp(`^\\d+(\\.\\d{0,${maxDecimals}})?`);
    const match = amountStr.match(regex);
    const formatted = match ? match[0] : amountStr;
    
    // Remove trailing zeros and return
    const result = parseFloat(formatted).toString();
    
    // Add debug logging for troubleshooting
    console.log(`[CurrencyConversion] formatAmountForTransaction: ${amount} -> ${result}`);
    
    return result;
  }

  /**
   * Get display string for conversion
   */
  getConversionDisplay(conversion: CurrencyConversion): string {
    const fromAmount = this.formatAmount(conversion.amount, conversion.fromCurrency);
    const toAmount = this.formatAmount(conversion.convertedAmount, conversion.toCurrency);
    
    return `${fromAmount} ${conversion.fromCurrency} = ${toAmount} ${conversion.toCurrency}`;
  }

  /**
   * Calculate percentage amount in native token
   */
  async calculatePercentageInNativeToken(
    totalUsdAmount: number,
    percentage: number,
    network: WalletNetwork
  ): Promise<{
    usdAmount: number;
    nativeTokenAmount: number;
    conversion: CurrencyConversion;
  }> {
    const usdAmount = totalUsdAmount * (percentage / 100);
    const conversion = await this.convertUsdToNativeToken(usdAmount, network);
    
    return {
      usdAmount,
      nativeTokenAmount: conversion.convertedAmount,
      conversion,
    };
  }
}

// Export singleton instance
export const currencyConverter = new CurrencyConversionService();
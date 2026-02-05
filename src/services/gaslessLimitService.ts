/**
 * Gasless Transaction Limit Service
 * 
 * Tracks daily gasless transaction usage and enforces limits.
 * Daily limit: 0.5 USDC equivalent
 */

import { Storage } from "@/utils/storage";

const STORAGE_KEY = 'blockfinax.gaslessUsage';
const DAILY_LIMIT_USD = 0.5; // $0.50 per day

interface DailyUsage {
  date: string; // YYYY-MM-DD
  totalUSD: number;
  transactions: {
    timestamp: number;
    amountUSD: number;
    token: string;
  }[];
}

class GaslessLimitService {
  private static instance: GaslessLimitService;

  public static getInstance(): GaslessLimitService {
    if (!GaslessLimitService.instance) {
      GaslessLimitService.instance = new GaslessLimitService();
    }
    return GaslessLimitService.instance;
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Get current daily usage
   */
  private async getDailyUsage(): Promise<DailyUsage> {
    try {
      const usage = await Storage.getJSON<DailyUsage>(STORAGE_KEY);
      if (!usage) {
        return {
          date: this.getTodayDate(),
          totalUSD: 0,
          transactions: [],
        };
      }

      // Reset if it's a new day
      if (usage.date !== this.getTodayDate()) {
        return {
          date: this.getTodayDate(),
          totalUSD: 0,
          transactions: [],
        };
      }

      return usage;
    } catch (error) {
      console.error('Error getting daily usage:', error);
      return {
        date: this.getTodayDate(),
        totalUSD: 0,
        transactions: [],
      };
    }
  }

  /**
   * Save daily usage
   */
  private async saveDailyUsage(usage: DailyUsage): Promise<void> {
    try {
      await Storage.setJSON(STORAGE_KEY, usage);
    } catch (error) {
      console.error('Error saving daily usage:', error);
    }
  }

  /**
   * Check if gasless transaction is allowed for the amount
   */
  public async canUseGasless(amountUSD: number): Promise<{
    allowed: boolean;
    remainingUSD: number;
    usedUSD: number;
    limitUSD: number;
  }> {
    const usage = await this.getDailyUsage();
    const remainingUSD = DAILY_LIMIT_USD - usage.totalUSD;
    const allowed = (usage.totalUSD + amountUSD) <= DAILY_LIMIT_USD;

    return {
      allowed,
      remainingUSD: Math.max(0, remainingUSD),
      usedUSD: usage.totalUSD,
      limitUSD: DAILY_LIMIT_USD,
    };
  }

  /**
   * Record a gasless transaction
   */
  public async recordTransaction(
    amountUSD: number,
    token: string
  ): Promise<void> {
    const usage = await this.getDailyUsage();

    usage.totalUSD += amountUSD;
    usage.transactions.push({
      timestamp: Date.now(),
      amountUSD,
      token,
    });

    await this.saveDailyUsage(usage);
  }

  /**
   * Get usage summary for display
   */
  public async getUsageSummary(): Promise<{
    usedUSD: number;
    limitUSD: number;
    remainingUSD: number;
    percentageUsed: number;
    transactionCount: number;
  }> {
    const usage = await this.getDailyUsage();
    const remainingUSD = Math.max(0, DAILY_LIMIT_USD - usage.totalUSD);
    const percentageUsed = Math.min(100, (usage.totalUSD / DAILY_LIMIT_USD) * 100);

    return {
      usedUSD: usage.totalUSD,
      limitUSD: DAILY_LIMIT_USD,
      remainingUSD,
      percentageUsed,
      transactionCount: usage.transactions.length,
    };
  }

  /**
   * Reset usage (for testing or manual reset)
   */
  public async resetUsage(): Promise<void> {
    await Storage.removeItem(STORAGE_KEY);
  }
}

export const gaslessLimitService = GaslessLimitService.getInstance();

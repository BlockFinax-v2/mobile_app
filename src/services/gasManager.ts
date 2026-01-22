import { parseEther, formatEther } from "viem";
import { tokenPriceService } from "./tokenPriceService";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Gas Manager Service
 * 
 * Manages gas sponsorship policies and tracks user gas usage
 * Implements tiered gas payment strategy:
 * 1. Sponsored (gasless) - for small transactions within daily limit
 * 2. ERC-20 payment - pay gas with the token being transacted
 * 3. Native payment - fallback to native ETH/BNB
 */

export interface GasSponsorshipPolicy {
  // Per-user daily limits
  perUserDailyLimitUSD: number; // in USD
  perUserDailyLimitETH: bigint; // in wei
  
  // Global limits (across all users)
  globalDailyLimitUSD: number;
  globalDailyLimitETH: bigint;
  
  // Transaction limits
  maxSponsoredValueUSD: number; // Don't sponsor tx above this value
  maxSponsoredValueETH: bigint;
  
  // Supported operations for sponsorship
  sponsoredOperations: string[];
}

export interface UserGasUsage {
  userId: string; // Wallet address
  dailyGasUsedWei: bigint;
  dailyGasUsedUSD: number;
  lastResetDate: string; // ISO date
  totalTransactions: number;
  sponsoredTransactions: number;
}

export interface GlobalGasUsage {
  dailyGasUsedWei: bigint;
  dailyGasUsedUSD: number;
  lastResetDate: string;
  totalUsers: number;
}

export type GasPaymentMethod = 'sponsored' | 'erc20' | 'native';

export interface GasPaymentDecision {
  method: GasPaymentMethod;
  reason: string;
  estimatedCostUSD: number;
  estimatedCostETH: bigint;
  remainingSponsoredUSD: number;
  canAfford: boolean;
}

/**
 * Default sponsorship policy
 * Customize these values based on your budget and user needs
 */
const DEFAULT_POLICY: GasSponsorshipPolicy = {
  // Per-user: ~3-5 standard ERC20 transfers per day
  perUserDailyLimitUSD: 0.50, // $0.50 USD worth of gas per user per day
  perUserDailyLimitETH: parseEther("0.0002"), // ~$0.50 at $2500 ETH
  
  // Global: Limit total daily sponsorship across all users
  globalDailyLimitUSD: 50.0, // $50 USD total per day
  globalDailyLimitETH: parseEther("0.02"), // ~$50 at $2500 ETH
  
  // Don't sponsor high-value transactions (potential abuse)
  maxSponsoredValueUSD: 100.0, // Don't sponsor tx > $100
  maxSponsoredValueETH: parseEther("0.04"),
  
  // Operations eligible for sponsorship
  sponsoredOperations: [
    'transfer',
    'approve',
    'stake',
    'unstake',
    'swap',
    'claim',
  ],
};

class GasManagerService {
  private policy: GasSponsorshipPolicy = DEFAULT_POLICY;
  private globalUsage: GlobalGasUsage | null = null;
  
  // Storage keys
  private readonly STORAGE_PREFIX = '@gas_manager:';
  private readonly USER_USAGE_KEY = (userId: string) => `${this.STORAGE_PREFIX}user_${userId}`;
  private readonly GLOBAL_USAGE_KEY = `${this.STORAGE_PREFIX}global`;
  
  /**
   * Initialize gas manager with custom policy
   */
  initialize(customPolicy?: Partial<GasSponsorshipPolicy>): void {
    if (customPolicy) {
      this.policy = { ...DEFAULT_POLICY, ...customPolicy };
    }
    console.log('[GasManager] Initialized with policy:', {
      perUserDailyLimitUSD: this.policy.perUserDailyLimitUSD,
      globalDailyLimitUSD: this.policy.globalDailyLimitUSD,
      maxSponsoredValueUSD: this.policy.maxSponsoredValueUSD,
    });
  }
  
  /**
   * Get current sponsorship policy
   */
  getPolicy(): GasSponsorshipPolicy {
    return { ...this.policy };
  }
  
  /**
   * Update sponsorship policy
   */
  updatePolicy(updates: Partial<GasSponsorshipPolicy>): void {
    this.policy = { ...this.policy, ...updates };
    console.log('[GasManager] Policy updated:', updates);
  }
  
  /**
   * Check if a transaction qualifies for gas sponsorship
   */
  async checkSponsorshipEligibility(
    userId: string,
    estimatedGasWei: bigint,
    transactionValueUSD: number,
    operation?: string
  ): Promise<GasPaymentDecision> {
    try {
      // Reset daily limits if needed
      await this.resetDailyLimitsIfNeeded();
      
      // Get user and global usage
      const userUsage = await this.getUserGasUsage(userId);
      const globalUsage = await this.getGlobalGasUsage();
      
      // Estimate gas cost in USD (approximate)
      const estimatedCostETH = estimatedGasWei;
      const estimatedCostUSD = parseFloat(formatEther(estimatedGasWei)) * 2500; // Rough $2500/ETH estimate
      
      // Calculate remaining limits
      const userRemainingUSD = this.policy.perUserDailyLimitUSD - userUsage.dailyGasUsedUSD;
      const globalRemainingUSD = this.policy.globalDailyLimitUSD - globalUsage.dailyGasUsedUSD;
      
      console.log('[GasManager] Sponsorship eligibility check:', {
        userId: userId.substring(0, 10) + '...',
        estimatedCostUSD: estimatedCostUSD.toFixed(4),
        transactionValueUSD,
        operation,
        userRemainingUSD: userRemainingUSD.toFixed(4),
        globalRemainingUSD: globalRemainingUSD.toFixed(2),
      });
      
      // Check 1: Operation must be in sponsored list (if specified)
      if (operation && !this.policy.sponsoredOperations.includes(operation)) {
        return {
          method: 'erc20',
          reason: `Operation '${operation}' not eligible for sponsorship`,
          estimatedCostUSD,
          estimatedCostETH,
          remainingSponsoredUSD: userRemainingUSD,
          canAfford: true,
        };
      }
      
      // Check 2: Transaction value must be below max sponsored value
      if (transactionValueUSD > this.policy.maxSponsoredValueUSD) {
        return {
          method: 'erc20',
          reason: `Transaction value ($${transactionValueUSD.toFixed(2)}) exceeds max sponsored value ($${this.policy.maxSponsoredValueUSD})`,
          estimatedCostUSD,
          estimatedCostETH,
          remainingSponsoredUSD: userRemainingUSD,
          canAfford: true,
        };
      }
      
      // Check 3: User must have remaining daily limit
      if (estimatedCostUSD > userRemainingUSD) {
        return {
          method: 'erc20',
          reason: `Daily sponsored limit exceeded. Resets tomorrow. (Used: $${userUsage.dailyGasUsedUSD.toFixed(4)} / $${this.policy.perUserDailyLimitUSD})`,
          estimatedCostUSD,
          estimatedCostETH,
          remainingSponsoredUSD: userRemainingUSD,
          canAfford: true,
        };
      }
      
      // Check 4: Global limit must not be exceeded
      if (estimatedCostUSD > globalRemainingUSD) {
        return {
          method: 'erc20',
          reason: `Global daily limit reached. Sponsorship temporarily unavailable.`,
          estimatedCostUSD,
          estimatedCostETH,
          remainingSponsoredUSD: userRemainingUSD,
          canAfford: true,
        };
      }
      
      // All checks passed - eligible for sponsorship!
      return {
        method: 'sponsored',
        reason: `✨ Transaction eligible for gas sponsorship! (${Math.floor(userRemainingUSD / estimatedCostUSD)} free transactions remaining today)`,
        estimatedCostUSD,
        estimatedCostETH,
        remainingSponsoredUSD: userRemainingUSD,
        canAfford: true,
      };
    } catch (error) {
      console.error('[GasManager] Error checking sponsorship eligibility:', error);
      // Fallback to ERC-20 payment on error
      return {
        method: 'erc20',
        reason: 'Unable to check sponsorship status. Using token payment.',
        estimatedCostUSD: 0,
        estimatedCostETH: BigInt(0),
        remainingSponsoredUSD: 0,
        canAfford: true,
      };
    }
  }
  
  /**
   * Select best gas payment method for a transaction
   */
  async selectPaymentMethod(
    userId: string,
    estimatedGasWei: bigint,
    transactionValueUSD: number,
    operation?: string,
    preferredMethod?: GasPaymentMethod
  ): Promise<GasPaymentDecision> {
    // If user has a preferred method, respect it (unless not affordable)
    if (preferredMethod === 'native' || preferredMethod === 'erc20') {
      return {
        method: preferredMethod,
        reason: 'User selected this payment method',
        estimatedCostUSD: parseFloat(formatEther(estimatedGasWei)) * 2500,
        estimatedCostETH: estimatedGasWei,
        remainingSponsoredUSD: 0,
        canAfford: true,
      };
    }
    
    // Otherwise, check sponsorship eligibility
    return await this.checkSponsorshipEligibility(
      userId,
      estimatedGasWei,
      transactionValueUSD,
      operation
    );
  }
  
  /**
   * Track gas usage after a transaction
   */
  async trackGasUsage(
    userId: string,
    gasUsedWei: bigint,
    wasSponsored: boolean
  ): Promise<void> {
    try {
      const gasUsedUSD = parseFloat(formatEther(gasUsedWei)) * 2500;
      
      // Update user usage
      const userUsage = await this.getUserGasUsage(userId);
      userUsage.dailyGasUsedWei += gasUsedWei;
      userUsage.dailyGasUsedUSD += gasUsedUSD;
      userUsage.totalTransactions += 1;
      if (wasSponsored) {
        userUsage.sponsoredTransactions += 1;
      }
      await this.saveUserGasUsage(userId, userUsage);
      
      // Update global usage if sponsored
      if (wasSponsored) {
        const globalUsage = await this.getGlobalGasUsage();
        globalUsage.dailyGasUsedWei += gasUsedWei;
        globalUsage.dailyGasUsedUSD += gasUsedUSD;
        await this.saveGlobalGasUsage(globalUsage);
      }
      
      console.log('[GasManager] Tracked gas usage:', {
        userId: userId.substring(0, 10) + '...',
        gasUsedUSD: gasUsedUSD.toFixed(4),
        wasSponsored,
        totalDailyUSD: userUsage.dailyGasUsedUSD.toFixed(4),
      });
    } catch (error) {
      console.error('[GasManager] Error tracking gas usage:', error);
    }
  }
  
  /**
   * Get user's gas usage stats
   */
  async getUserGasUsage(userId: string): Promise<UserGasUsage> {
    try {
      const stored = await AsyncStorage.getItem(this.USER_USAGE_KEY(userId));
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert string back to bigint
        return {
          ...parsed,
          dailyGasUsedWei: BigInt(parsed.dailyGasUsedWei || '0'),
        };
      }
    } catch (error) {
      console.error('[GasManager] Error loading user usage:', error);
    }
    
    // Return default
    return {
      userId,
      dailyGasUsedWei: BigInt(0),
      dailyGasUsedUSD: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      totalTransactions: 0,
      sponsoredTransactions: 0,
    };
  }
  
  /**
   * Get global gas usage stats
   */
  async getGlobalGasUsage(): Promise<GlobalGasUsage> {
    try {
      const stored = await AsyncStorage.getItem(this.GLOBAL_USAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          dailyGasUsedWei: BigInt(parsed.dailyGasUsedWei || '0'),
        };
      }
    } catch (error) {
      console.error('[GasManager] Error loading global usage:', error);
    }
    
    return {
      dailyGasUsedWei: BigInt(0),
      dailyGasUsedUSD: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      totalUsers: 0,
    };
  }
  
  /**
   * Save user gas usage
   */
  private async saveUserGasUsage(userId: string, usage: UserGasUsage): Promise<void> {
    try {
      // Convert bigint to string for storage
      const toStore = {
        ...usage,
        dailyGasUsedWei: usage.dailyGasUsedWei.toString(),
      };
      await AsyncStorage.setItem(this.USER_USAGE_KEY(userId), JSON.stringify(toStore));
    } catch (error) {
      console.error('[GasManager] Error saving user usage:', error);
    }
  }
  
  /**
   * Save global gas usage
   */
  private async saveGlobalGasUsage(usage: GlobalGasUsage): Promise<void> {
    try {
      const toStore = {
        ...usage,
        dailyGasUsedWei: usage.dailyGasUsedWei.toString(),
      };
      await AsyncStorage.setItem(this.GLOBAL_USAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('[GasManager] Error saving global usage:', error);
    }
  }
  
  /**
   * Reset daily limits if it's a new day
   */
  async resetDailyLimitsIfNeeded(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check global usage
    const globalUsage = await this.getGlobalGasUsage();
    if (globalUsage.lastResetDate !== today) {
      console.log('[GasManager] Resetting daily limits (new day)');
      globalUsage.dailyGasUsedWei = BigInt(0);
      globalUsage.dailyGasUsedUSD = 0;
      globalUsage.lastResetDate = today;
      await this.saveGlobalGasUsage(globalUsage);
    }
  }
  
  /**
   * Reset user's daily limit manually
   */
  async resetUserDailyLimit(userId: string): Promise<void> {
    const usage = await this.getUserGasUsage(userId);
    usage.dailyGasUsedWei = BigInt(0);
    usage.dailyGasUsedUSD = 0;
    usage.lastResetDate = new Date().toISOString().split('T')[0];
    await this.saveUserGasUsage(userId, usage);
    console.log('[GasManager] User daily limit reset:', userId);
  }
  
  /**
   * Get available gas tokens for a network
   */
  getAvailableGasTokens(networkId: string): string[] {
    // Common stablecoins that can be used for gas payment
    const commonGasTokens = ['USDC', 'USDT'];
    
    // Network-specific tokens
    const networkTokens: Record<string, string[]> = {
      'ethereum-mainnet': [...commonGasTokens],
      'ethereum-sepolia': [...commonGasTokens],
      'base-mainnet': [...commonGasTokens],
      'base-sepolia': [...commonGasTokens],
      'lisk-mainnet': [...commonGasTokens],
      'lisk-sepolia': [...commonGasTokens],
    };
    
    return networkTokens[networkId] || commonGasTokens;
  }
  
  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    dailyUsedUSD: number;
    dailyLimitUSD: number;
    remainingUSD: number;
    percentUsed: number;
    sponsoredCount: number;
    totalCount: number;
    estimatedFreeTransactionsLeft: number;
  }> {
    const usage = await this.getUserGasUsage(userId);
    const remainingUSD = Math.max(0, this.policy.perUserDailyLimitUSD - usage.dailyGasUsedUSD);
    const percentUsed = Math.min(100, (usage.dailyGasUsedUSD / this.policy.perUserDailyLimitUSD) * 100);
    
    // Estimate how many standard transfers are left (assuming ~$0.10 per transfer)
    const avgTransferCost = 0.10;
    const estimatedFreeTransactionsLeft = Math.floor(remainingUSD / avgTransferCost);
    
    return {
      dailyUsedUSD: usage.dailyGasUsedUSD,
      dailyLimitUSD: this.policy.perUserDailyLimitUSD,
      remainingUSD,
      percentUsed,
      sponsoredCount: usage.sponsoredTransactions,
      totalCount: usage.totalTransactions,
      estimatedFreeTransactionsLeft,
    };
  }
}

// Export singleton
export const gasManager = new GasManagerService();

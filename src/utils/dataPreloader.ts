/**
 * Global Data Preloader
 * Preloads all essential data when the app starts
 */

import { stakingService } from '@/services/stakingService';
import { performanceCache } from './performanceCache';
import { asyncQueue, TaskPriority } from './asyncQueue';

export interface PreloadedData {
  staking: {
    stakeInfo: any;
    poolStats: any;
    stakingConfig: any;
    usdcBalance: string;
    currentAPR: number;
    isFinancier: boolean;
  } | null;
  governance: {
    proposals: any[];
    daoStats: any;
    daoConfig: any;
  } | null;
}

class DataPreloader {
  private isPreloading = false;
  private preloadComplete = false;
  private preloadPromise: Promise<PreloadedData> | null = null;

  /**
   * Preload all essential data for the app
   */
  async preloadAll(address: string, chainId: number): Promise<PreloadedData> {
    // Return existing promise if already preloading
    if (this.isPreloading && this.preloadPromise) {
      console.log('[Preloader] Already preloading, returning existing promise');
      return this.preloadPromise;
    }

    // Check cache first
    const stakingCacheKey = `staking:${address}:${chainId}`;
    const governanceCacheKey = `governance:${address}:${chainId}`;
    
    const cachedStaking = performanceCache.get(stakingCacheKey);
    const cachedGovernance = performanceCache.get(governanceCacheKey);

    if (cachedStaking && cachedGovernance && this.preloadComplete) {
      console.log('[Preloader] Returning cached preloaded data');
      return {
        staking: cachedStaking as any,
        governance: cachedGovernance as any,
      };
    }

    this.isPreloading = true;
    console.log('[Preloader] Starting data preload for', address);

    this.preloadPromise = this.executePreload(address, chainId);

    try {
      const result = await this.preloadPromise;
      this.preloadComplete = true;
      console.log('[Preloader] Preload complete');
      return result;
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Execute the actual preloading
   */
  private async executePreload(
    address: string,
    chainId: number
  ): Promise<PreloadedData> {
    const result: PreloadedData = {
      staking: null,
      governance: null,
    };

    try {
      // Initialize staking service
      await stakingService.getSigner();

      // Preload staking data with high priority
      console.log('[Preloader] Loading staking data...');
      const [stake, config, balance, apr, isEligible] = await Promise.all([
        asyncQueue.enqueue(
          () => stakingService.getStakeInfo(address),
          TaskPriority.CRITICAL
        ),
        asyncQueue.enqueue(
          () => stakingService.getStakingConfig(),
          TaskPriority.CRITICAL
        ),
        asyncQueue.enqueue(
          () => stakingService.getUSDCBalance(address),
          TaskPriority.HIGH
        ),
        asyncQueue.enqueue(
          () => stakingService.calculateCurrentAPR(),
          TaskPriority.NORMAL
        ),
        asyncQueue.enqueue(
          () => stakingService.isFinancier(address),
          TaskPriority.CRITICAL
        ),
      ]);

      result.staking = {
        stakeInfo: stake,
        poolStats: null, // getPoolStats removed - function no longer exists in contract
        stakingConfig: config,
        usdcBalance: balance,
        currentAPR: apr,
        isFinancier: isEligible,
      };

      // Cache staking data (5 minutes)
      performanceCache.set(
        `staking:${address}:${chainId}`,
        result.staking,
        5 * 60 * 1000
      );

      console.log('[Preloader] Staking data loaded');

      // Preload governance data
      if (chainId === 4202) {
        console.log('[Preloader] Loading governance data...');
        const [proposals, stats, daoConfig] = await Promise.all([
          asyncQueue.enqueue(
            () => stakingService.getAllProposals(),
            TaskPriority.HIGH
          ),
          asyncQueue.enqueue(
            () => stakingService.getDAOStats(),
            TaskPriority.NORMAL
          ),
          asyncQueue.enqueue(
            () => stakingService.getDAOConfig(),
            TaskPriority.HIGH
          ),
        ]);

        result.governance = {
          proposals,
          daoStats: stats,
          daoConfig,
        };

        // Cache governance data (2 minutes)
        performanceCache.set(
          `governance:${address}:${chainId}`,
          result.governance,
          2 * 60 * 1000
        );

        console.log('[Preloader] Governance data loaded');
      }
    } catch (error) {
      console.error('[Preloader] Error during preload:', error);
      // Don't throw - allow partial data to be used
    }

    return result;
  }

  /**
   * Invalidate preloaded data (force refresh on next preload)
   */
  invalidate(): void {
    this.preloadComplete = false;
    this.preloadPromise = null;
    console.log('[Preloader] Preload cache invalidated');
  }

  /**
   * Check if preload is complete
   */
  isComplete(): boolean {
    return this.preloadComplete;
  }
}

// Export singleton
export const dataPreloader = new DataPreloader();

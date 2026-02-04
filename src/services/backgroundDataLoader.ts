/**
 * Background Data Loader Service
 * 
 * ⚡ PERFORMANCE: Preloads all app data BEFORE authentication
 * 🎯 UX: User sees data instantly after unlocking - no loading states
 * 💾 PERSISTENCE: Data persists until removal events are emitted
 * 
 * Flow:
 * 1. User arrives at unlock screen
 * 2. Background loader starts fetching all data from cache + blockchain
 * 3. User enters fingerprint/password
 * 4. App unlocks with ALL data already loaded
 * 5. Zero loading states visible to user
 */

import { Storage } from "@/utils/storage";
import { tradeFinanceService, PGAInfo } from './tradeFinanceService';
import { tradeFinanceEventService } from './tradeFinanceEventService';

const STORAGE_KEYS = {
  // TradeFinance
  TRADE_APPLICATIONS: 'bg_trade_applications',
  TRADE_DRAFTS: 'bg_trade_drafts',
  TRADE_LAST_SYNC: 'bg_trade_last_sync',
  TRADE_LOGISTICS_PARTNERS: 'bg_trade_logistics_partners',
  TRADE_DELIVERY_PERSONS: 'bg_trade_delivery_persons',

  // Treasury
  TREASURY_POOLS: 'bg_treasury_pools',
  TREASURY_POSITIONS: 'bg_treasury_positions',
  TREASURY_TRANSACTIONS: 'bg_treasury_transactions',
  TREASURY_LAST_SYNC: 'bg_treasury_last_sync',

  // Wallet
  WALLET_BALANCES: 'bg_wallet_balances',
  WALLET_TRANSACTIONS: 'bg_wallet_transactions',

  // Metadata
  PRELOAD_STATUS: 'bg_preload_status',
  PRELOAD_TIMESTAMP: 'bg_preload_timestamp',
};

export interface PreloadStatus {
  isPreloading: boolean;
  tradeFinanceReady: boolean;
  treasuryReady: boolean;
  walletReady: boolean;
  lastPreloadTime: number;
  cacheAge: number; // milliseconds since last successful preload
}

class BackgroundDataLoaderService {
  private static instance: BackgroundDataLoaderService;
  private isPreloading = false;
  private preloadListeners: Set<(status: PreloadStatus) => void> = new Set();

  public static getInstance(): BackgroundDataLoaderService {
    if (!BackgroundDataLoaderService.instance) {
      BackgroundDataLoaderService.instance = new BackgroundDataLoaderService();
    }
    return BackgroundDataLoaderService.instance;
  }

  /**
   * Subscribe to preload status changes
   */
  public onPreloadStatusChange(callback: (status: PreloadStatus) => void): () => void {
    this.preloadListeners.add(callback);
    return () => this.preloadListeners.delete(callback);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: PreloadStatus): void {
    this.preloadListeners.forEach(callback => callback(status));
  }

  /**
   * Get current preload status
   */
  public getPreloadStatus(): PreloadStatus {
    try {
      const status = Storage.getJSON<any>(STORAGE_KEYS.PRELOAD_STATUS);
      const timestampStr = Storage.getItem(STORAGE_KEYS.PRELOAD_TIMESTAMP);

      if (status && timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        const cacheAge = Date.now() - timestamp;

        return {
          ...status,
          lastPreloadTime: timestamp,
          cacheAge,
        };
      }
    } catch (error) {
      console.warn('[BackgroundLoader] Failed to get preload status:', error);
    }

    return {
      isPreloading: false,
      tradeFinanceReady: false,
      treasuryReady: false,
      walletReady: false,
      lastPreloadTime: 0,
      cacheAge: Infinity,
    };
  }

  /**
   * Update preload status
   */
  private updatePreloadStatus(updates: Partial<PreloadStatus>): void {
    const current = this.getPreloadStatus();
    const newStatus: PreloadStatus = { ...current, ...updates };

    Storage.setJSON(STORAGE_KEYS.PRELOAD_STATUS, newStatus);
    Storage.setItem(STORAGE_KEYS.PRELOAD_TIMESTAMP, Date.now().toString());

    this.notifyListeners(newStatus);
  }

  /**
   * Start background preloading (called when unlock screen appears)
   * @param userAddress - User wallet address
   * @param chainId - Current network chain ID
   */
  public async startPreloading(userAddress: string, chainId: number): Promise<void> {
    if (this.isPreloading) {
      console.log('[BackgroundLoader] ⏭️ Already preloading, skipping');
      return;
    }

    this.isPreloading = true;
    const startTime = performance.now();

    console.log('[BackgroundLoader] 🚀 Starting background preload...');
    console.log(`[BackgroundLoader] User: ${userAddress}, Chain: ${chainId}`);

    this.updatePreloadStatus({ isPreloading: true });

    try {
      // Run all preloads in parallel for maximum speed
      await Promise.all([
        this.preloadTradeFinance(userAddress, chainId),
        this.preloadTreasury(userAddress, chainId),
        // Wallet data will be loaded by WalletContext
      ]);

      const totalTime = performance.now() - startTime;
      console.log(`[BackgroundLoader] ✅ Preload complete in ${totalTime.toFixed(0)}ms`);

      this.updatePreloadStatus({
        isPreloading: false,
        tradeFinanceReady: true,
        treasuryReady: true,
        walletReady: true,
      });
    } catch (error) {
      console.error('[BackgroundLoader] ⚠️ Preload error:', error);
      this.updatePreloadStatus({ isPreloading: false });
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload TradeFinance data
   * 
   * PERSISTENT STORAGE STRATEGY:
   * - PGAs are stored permanently in AsyncStorage (never deleted)
   * - Only fetch NEW events since last sync (incremental updates)
   * - First install: One-time full fetch, then incremental forever
   * - Completed PGAs persist for historical reference
   * - Saves API quota, battery, and loading time
   */
  private async preloadTradeFinance(userAddress: string, chainId: number): Promise<void> {
    const startTime = performance.now();
    console.log('[BackgroundLoader] 📦 Preloading TradeFinance...');

    try {
      // 1. Load last sync block
      const lastSyncStr = Storage.getItem(STORAGE_KEYS.TRADE_LAST_SYNC);
      const lastSyncBlock = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;

      // 2. Fetch historical events (incremental since last sync)
      const events = await tradeFinanceEventService.fetchPastEvents(
        userAddress,
        lastSyncBlock > 0 ? lastSyncBlock + 1 : 0,
        'latest',
        2000 // Fetch up to 2000 blocks of history
      );

      console.log(`[BackgroundLoader] 📊 Found ${events.length} trade events`);

      // 3. Get unique PGA IDs from events
      const pgaIds = new Set<string>();
      events.forEach(event => pgaIds.add(event.pgaId));

      // 4. Fetch all PGAs (using cache when possible)
      let applications: PGAInfo[] = [];
      if (pgaIds.size > 0) {
        const buyerPGAs = await tradeFinanceService.getAllPGAsByBuyer(userAddress, false);
        const sellerPGAs = await tradeFinanceService.getAllPGAsBySeller(userAddress, false);
        applications = [...buyerPGAs, ...sellerPGAs];
      } else if (lastSyncBlock === 0) {
        // First load - fetch all
        const buyerPGAs = await tradeFinanceService.getAllPGAsByBuyer(userAddress, false);
        const sellerPGAs = await tradeFinanceService.getAllPGAsBySeller(userAddress, false);
        applications = [...buyerPGAs, ...sellerPGAs];
      } else {
        // No new events - load from cache
        applications = Storage.getJSON<PGAInfo[]>(STORAGE_KEYS.TRADE_APPLICATIONS) || [];
      }

      // 5. Fetch logistics providers
      const [logisticsPartners, deliveryPersons] = await Promise.all([
        tradeFinanceService.getAllLogisticsPartners(),
        tradeFinanceService.getAllDeliveryPersons(),
      ]);

      // 6. Save to persistent cache (synchronous)
      Storage.setJSON(STORAGE_KEYS.TRADE_APPLICATIONS, applications);
      Storage.setJSON(STORAGE_KEYS.TRADE_LOGISTICS_PARTNERS, logisticsPartners);
      Storage.setJSON(STORAGE_KEYS.TRADE_DELIVERY_PERSONS, deliveryPersons);
      Storage.setItem(STORAGE_KEYS.TRADE_LAST_SYNC, tradeFinanceEventService.getLastProcessedBlock().toString());

      const loadTime = performance.now() - startTime;
      console.log(`[BackgroundLoader] ✅ TradeFinance preloaded in ${loadTime.toFixed(0)}ms (${applications.length} PGAs)`);
    } catch (error) {
      console.error('[BackgroundLoader] ⚠️ TradeFinance preload error:', error);
      throw error;
    }
  }

  /**
   * Preload Treasury data
   * 
   * PERSISTENT STORAGE STRATEGY:
   * - Staking positions, proposals, and events stored permanently in AsyncStorage
   * - Only fetch NEW events since last sync (incremental updates)
   * - First install: One-time full fetch, then incremental forever
   * - Completed proposals/stakes persist for historical reference
   * - Saves API quota, battery, and loading time
   * - TreasuryContext handles its own incremental sync logic
   */
  private async preloadTreasury(userAddress: string, chainId: number): Promise<void> {
    const startTime = performance.now();
    console.log('[BackgroundLoader] 💰 Treasury preload delegated to TreasuryContext');

    try {
      // Mark treasury as ready - TreasuryContext handles its own persistent storage
      Storage.setItem(STORAGE_KEYS.TREASURY_LAST_SYNC, Date.now().toString());

      const loadTime = performance.now() - startTime;
      console.log(`[BackgroundLoader] ✅ Treasury marked ready in ${loadTime.toFixed(0)}ms`);
    } catch (error) {
      console.error('[BackgroundLoader] ⚠️ Treasury preload error:', error);
      throw error;
    }
  }

  /**
   * Get cached TradeFinance data (instant synchronous)
   */
  public getCachedTradeFinanceData(): {
    applications: PGAInfo[];
    logisticsPartners: string[];
    deliveryPersons: string[];
    lastSyncBlock: number;
  } {
    try {
      const apps = Storage.getJSON<PGAInfo[]>(STORAGE_KEYS.TRADE_APPLICATIONS);
      const partners = Storage.getJSON<string[]>(STORAGE_KEYS.TRADE_LOGISTICS_PARTNERS);
      const persons = Storage.getJSON<string[]>(STORAGE_KEYS.TRADE_DELIVERY_PERSONS);
      const syncStr = Storage.getItem(STORAGE_KEYS.TRADE_LAST_SYNC);

      return {
        applications: apps || [],
        logisticsPartners: partners || [],
        deliveryPersons: persons || [],
        lastSyncBlock: syncStr ? parseInt(syncStr, 10) : 0,
      };
    } catch (error) {
      console.error('[BackgroundLoader] Failed to get cached TradeFinance data:', error);
      return {
        applications: [],
        logisticsPartners: [],
        deliveryPersons: [],
        lastSyncBlock: 0,
      };
    }
  }

  /**
   * Get cached Treasury data (instant synchronous)
   * Note: Returns data managed by TreasuryContext's own caching system
   */
  public getCachedTreasuryData(): {
    pools: any[];
    position: any | null;
  } {
    try {
      const pools = Storage.getJSON<any[]>(STORAGE_KEYS.TREASURY_POOLS);
      const position = Storage.getJSON<any>(STORAGE_KEYS.TREASURY_POSITIONS);

      return {
        pools: pools || [],
        position: position || null,
      };
    } catch (error) {
      console.error('[BackgroundLoader] Failed to get cached Treasury data:', error);
      return {
        pools: [],
        position: null,
      };
    }
  }

  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<void> {
    console.log('[BackgroundLoader] 🗑️ Clearing all cached data');

    Storage.clearAll(); // Clears all MMKV storage

    this.updatePreloadStatus({
      tradeFinanceReady: false,
      treasuryReady: false,
      walletReady: false,
    });
  }
}

export const backgroundDataLoader = BackgroundDataLoaderService.getInstance();

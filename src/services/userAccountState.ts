import { Storage } from "@/utils/storage";
import { Address } from "viem";

/**
 * User Account State Service
 * 
 * Manages user account state including:
 * - EOA and Smart Account addresses
 * - Deployment status
 * - Gas preferences
 * - Transaction history
 */

export interface UserAccountState {
  // Addresses
  eoaAddress: Address;
  smartAccountAddress: Address | null;

  // Deployment
  smartAccountDeployed: boolean;
  deploymentTxHash: string | null;
  deploymentDate: string | null;

  // Preferences
  preferredGasToken: string; // 'USDC', 'USDT', 'native'
  autoUseSponsorship: boolean; // Automatically use sponsored gas when available

  // Stats
  totalTransactions: number;
  sponsoredTransactions: number;
  firstTransactionDate: string | null;
  lastTransactionDate: string | null;

  // Network-specific smart accounts (multi-chain support)
  smartAccountsByNetwork: Record<string, Address>;
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  type: 'send' | 'receive' | 'stake' | 'unstake' | 'swap' | 'approve' | 'other';
  from: Address;
  to: Address;
  amount: string;
  tokenSymbol: string;
  gasPaymentMethod: 'sponsored' | 'erc20' | 'native';
  gasUsedWei: string;
  gasTokenSymbol?: string;
  txHash: string;
  network: string;
  status: 'pending' | 'success' | 'failed';
}

class UserAccountStateService {
  private readonly STORAGE_PREFIX = '@user_account:';
  private readonly ACCOUNT_STATE_KEY = (address: string) =>
    `${this.STORAGE_PREFIX}state_${address.toLowerCase()}`;
  private readonly TX_HISTORY_KEY = (address: string) =>
    `${this.STORAGE_PREFIX}tx_history_${address.toLowerCase()}`;

  /**
   * Get user account state
   */
  async getUserState(eoaAddress: Address): Promise<UserAccountState | null> {
    try {
      return await Storage.getJSON<UserAccountState>(this.ACCOUNT_STATE_KEY(eoaAddress));
    } catch (error) {
      console.error('[UserAccountState] Error loading user state:', error);
    }
    return null;
  }

  /**
   * Create initial user state
   */
  async createUserState(
    eoaAddress: Address,
    smartAccountAddress: Address,
    network: string
  ): Promise<UserAccountState> {
    const state: UserAccountState = {
      eoaAddress,
      smartAccountAddress,
      smartAccountDeployed: false,
      deploymentTxHash: null,
      deploymentDate: null,
      preferredGasToken: 'USDC',
      autoUseSponsorship: true,
      totalTransactions: 0,
      sponsoredTransactions: 0,
      firstTransactionDate: null,
      lastTransactionDate: null,
      smartAccountsByNetwork: {
        [network]: smartAccountAddress,
      },
    };

    await this.saveUserState(state);
    console.log('[UserAccountState] Created new user state:', {
      eoa: eoaAddress,
      smartAccount: smartAccountAddress,
      network,
    });

    return state;
  }

  /**
   * Save user state
   */
  async saveUserState(state: UserAccountState): Promise<void> {
    try {
      await Storage.setJSON(this.ACCOUNT_STATE_KEY(state.eoaAddress), state);
    } catch (error) {
      console.error('[UserAccountState] Error saving user state:', error);
      throw error;
    }
  }

  /**
   * Update smart account deployment status
   */
  async markSmartAccountDeployed(
    eoaAddress: Address,
    txHash: string
  ): Promise<void> {
    const state = await this.getUserState(eoaAddress);
    if (!state) {
      throw new Error('User state not found');
    }

    state.smartAccountDeployed = true;
    state.deploymentTxHash = txHash;
    state.deploymentDate = new Date().toISOString();

    await this.saveUserState(state);
    console.log('[UserAccountState] Smart account marked as deployed:', txHash);
  }

  /**
   * Update gas token preference
   */
  async updateGasTokenPreference(
    eoaAddress: Address,
    tokenSymbol: string
  ): Promise<void> {
    const state = await this.getUserState(eoaAddress);
    if (!state) {
      throw new Error('User state not found');
    }

    state.preferredGasToken = tokenSymbol;
    await this.saveUserState(state);
    console.log('[UserAccountState] Updated gas token preference:', tokenSymbol);
  }

  /**
   * Update auto-sponsorship preference
   */
  async updateAutoSponsorship(
    eoaAddress: Address,
    enabled: boolean
  ): Promise<void> {
    const state = await this.getUserState(eoaAddress);
    if (!state) {
      throw new Error('User state not found');
    }

    state.autoUseSponsorship = enabled;
    await this.saveUserState(state);
    console.log('[UserAccountState] Updated auto-sponsorship:', enabled);
  }

  /**
   * Add smart account for a new network
   */
  async addSmartAccountForNetwork(
    eoaAddress: Address,
    network: string,
    smartAccountAddress: Address
  ): Promise<void> {
    const state = await this.getUserState(eoaAddress);
    if (!state) {
      throw new Error('User state not found');
    }

    state.smartAccountsByNetwork[network] = smartAccountAddress;
    await this.saveUserState(state);
    console.log('[UserAccountState] Added smart account for network:', network);
  }

  /**
   * Get smart account for a specific network
   */
  async getSmartAccountForNetwork(
    eoaAddress: Address,
    network: string
  ): Promise<Address | null> {
    const state = await this.getUserState(eoaAddress);
    if (!state) {
      return null;
    }

    return state.smartAccountsByNetwork[network] || null;
  }

  /**
   * Record a transaction
   */
  async recordTransaction(tx: TransactionRecord): Promise<void> {
    try {
      // Update user state stats
      const state = await this.getUserState(tx.from);
      if (state) {
        state.totalTransactions += 1;
        if (tx.gasPaymentMethod === 'sponsored') {
          state.sponsoredTransactions += 1;
        }
        if (!state.firstTransactionDate) {
          state.firstTransactionDate = tx.timestamp;
        }
        state.lastTransactionDate = tx.timestamp;
        await this.saveUserState(state);
      }

      // Add to transaction history
      const history = await this.getTransactionHistory(tx.from, 100);
      history.unshift(tx);

      // Keep only last 100 transactions
      const limited = history.slice(0, 100);

      await Storage.setJSON(this.TX_HISTORY_KEY(tx.from), limited);

      console.log('[UserAccountState] Recorded transaction:', {
        type: tx.type,
        gasMethod: tx.gasPaymentMethod,
        txHash: tx.txHash.substring(0, 10) + '...',
      });
    } catch (error) {
      console.error('[UserAccountState] Error recording transaction:', error);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    eoaAddress: Address,
    limit: number = 20
  ): Promise<TransactionRecord[]> {
    try {
      const history = await Storage.getJSON<TransactionRecord[]>(this.TX_HISTORY_KEY(eoaAddress));
      if (history) {
        return history.slice(0, limit);
      }
    } catch (error) {
      console.error('[UserAccountState] Error loading transaction history:', error);
    }
    return [];
  }

  /**
   * Clear user data (for logout/reset)
   */
  async clearUserData(eoaAddress: Address): Promise<void> {
    try {
      await Storage.removeItem(this.ACCOUNT_STATE_KEY(eoaAddress));
      await Storage.removeItem(this.TX_HISTORY_KEY(eoaAddress));
      console.log('[UserAccountState] Cleared user data');
    } catch (error) {
      console.error('[UserAccountState] Error clearing user data:', error);
    }
  }

  /**
   * Check if smart account is deployed
   */
  async isSmartAccountDeployed(eoaAddress: Address): Promise<boolean> {
    const state = await this.getUserState(eoaAddress);
    return state?.smartAccountDeployed || false;
  }

  /**
   * Get user statistics
   */
  async getUserStats(eoaAddress: Address): Promise<{
    totalTransactions: number;
    sponsoredTransactions: number;
    paidTransactions: number;
    sponsorshipPercentage: number;
    accountAge: number; // days since first transaction
  } | null> {
    const state = await this.getUserState(eoaAddress);
    if (!state) {
      return null;
    }

    const paidTransactions = state.totalTransactions - state.sponsoredTransactions;
    const sponsorshipPercentage = state.totalTransactions > 0
      ? (state.sponsoredTransactions / state.totalTransactions) * 100
      : 0;

    let accountAge = 0;
    if (state.firstTransactionDate) {
      const firstDate = new Date(state.firstTransactionDate);
      const now = new Date();
      accountAge = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      totalTransactions: state.totalTransactions,
      sponsoredTransactions: state.sponsoredTransactions,
      paidTransactions,
      sponsorshipPercentage,
      accountAge,
    };
  }
}

// Export singleton
export const userAccountState = new UserAccountStateService();

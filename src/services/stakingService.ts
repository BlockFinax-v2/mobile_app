/**
 * Staking Service
 * 
 * Handles all interactions with the BlockFinax Diamond Contract Staking System
 * Integrates with LiquidityPoolFacet for staking, unstaking, and rewards management
 */

import { WalletNetwork } from "@/contexts/WalletContext";
import { secureStorage } from "@/utils/secureStorage";
import { ethers } from "ethers";

// Contract Configuration
export const DIAMOND_CONTRACT_ADDRESS = "0xe1A27Ee53D0E90F024965E6826e0BCA28946747A";

// Lisk Sepolia Network Configuration
export const LISK_SEPOLIA_NETWORK: WalletNetwork = {
  id: "lisk-sepolia",
  name: "Lisk Sepolia",
  chainId: 4202,
  rpcUrl: "https://rpc.sepolia-api.lisk.com",
  explorerUrl: "https://sepolia-blockscout.lisk.com",
  primaryCurrency: "ETH",
  isTestnet: true,
  stablecoins: [
    {
      symbol: "USDC",
      name: "USD Coin (Bridged)",
      address: "0x0E82fDDAd51cc3ac12b69761C45bBCB9A2Bf3C83",
      decimals: 6,
    },
  ],
};

// LiquidityPoolFacet ABI
const LIQUIDITY_POOL_FACET_ABI = [
  {"inputs":[],"name":"BelowMinimumStake","type":"error"},
  {"inputs":[],"name":"ContractPaused","type":"error"},
  {"inputs":[],"name":"InsufficientBalance","type":"error"},
  {"inputs":[],"name":"InsufficientStakedAmount","type":"error"},
  {"inputs":[],"name":"InvalidAPR","type":"error"},
  {"inputs":[],"name":"InvalidLockDuration","type":"error"},
  {"inputs":[],"name":"InvalidPenalty","type":"error"},
  {"inputs":[],"name":"LockDurationNotMet","type":"error"},
  {"inputs":[],"name":"NoActiveStake","type":"error"},
  {"inputs":[],"name":"NoRewardsToCllaim","type":"error"},
  {"inputs":[],"name":"NotContractOwner","type":"error"},
  {"inputs":[],"name":"NothingToUnstake","type":"error"},
  {"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},
  {"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},
  {"inputs":[],"name":"StakerNotActive","type":"error"},
  {"inputs":[],"name":"ZeroAmount","type":"error"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"}],"name":"EmergencyWithdrawn","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldRate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newRate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalStaked","type":"uint256"}],"name":"RewardRateUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsClaimed","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsDistributed","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"votingPower","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"currentApr","type":"uint256"}],"name":"Staked","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"parameter","type":"string"},{"indexed":false,"internalType":"uint256","name":"oldValue","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newValue","type":"uint256"}],"name":"StakingConfigUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"rewards","type":"uint256"}],"name":"Unstaked","type":"event"},
  {"inputs":[],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"distributeRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getPendingRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getPoolStats","outputs":[{"internalType":"uint256","name":"totalStaked","type":"uint256"},{"internalType":"uint256","name":"totalLiquidityProviders","type":"uint256"},{"internalType":"uint256","name":"contractBalance","type":"uint256"},{"internalType":"uint256","name":"currentRewardRate","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getStake","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"votingPower","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"pendingRewards","type":"uint256"},{"internalType":"uint256","name":"timeUntilUnlock","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getStakers","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getStakingConfig","outputs":[{"internalType":"uint256","name":"initialApr","type":"uint256"},{"internalType":"uint256","name":"currentRewardRate","type":"uint256"},{"internalType":"uint256","name":"minLockDuration","type":"uint256"},{"internalType":"uint256","name":"aprReductionPerThousand","type":"uint256"},{"internalType":"uint256","name":"emergencyWithdrawPenalty","type":"uint256"},{"internalType":"uint256","name":"minimumStake","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_usdcToken","type":"address"},{"internalType":"uint256","name":"_minimumStake","type":"uint256"},{"internalType":"uint256","name":"_initialApr","type":"uint256"},{"internalType":"uint256","name":"_minLockDuration","type":"uint256"},{"internalType":"uint256","name":"_aprReductionPerThousand","type":"uint256"},{"internalType":"uint256","name":"_emergencyWithdrawPenalty","type":"uint256"}],"name":"initializeComplete","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_initialApr","type":"uint256"},{"internalType":"uint256","name":"_minLockDuration","type":"uint256"},{"internalType":"uint256","name":"_aprReductionPerThousand","type":"uint256"},{"internalType":"uint256","name":"_emergencyWithdrawPenalty","type":"uint256"}],"name":"initializeStaking","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_minimumStake","type":"uint256"}],"name":"setMinimumStake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_usdcToken","type":"address"}],"name":"setUsdcToken","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_initialApr","type":"uint256"},{"internalType":"uint256","name":"_minLockDuration","type":"uint256"},{"internalType":"uint256","name":"_aprReductionPerThousand","type":"uint256"},{"internalType":"uint256","name":"_emergencyWithdrawPenalty","type":"uint256"}],"name":"updateStakingConfig","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

// ERC-20 ABI for USDC approval
const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const MNEMONIC_KEY = "blockfinax.mnemonic";
const PRIVATE_KEY = "blockfinax.privateKey";

export interface StakeInfo {
  amount: string;
  timestamp: number;
  votingPower: string;
  active: boolean;
  pendingRewards: string;
  timeUntilUnlock: number;
}

export interface PoolStats {
  totalStaked: string;
  totalLiquidityProviders: number;
  contractBalance: string;
  currentRewardRate: string;
}

export interface StakingConfig {
  initialApr: number;
  currentRewardRate: string;
  minLockDuration: number;
  aprReductionPerThousand: number;
  emergencyWithdrawPenalty: number;
  minimumStake: string;
}

export interface StakingTransaction {
  hash: string;
  type: 'approve' | 'stake' | 'unstake' | 'claim' | 'emergency';
  amount?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  explorerUrl?: string;
}

class StakingService {
  private static instance: StakingService;

  public static getInstance(): StakingService {
    if (!StakingService.instance) {
      StakingService.instance = new StakingService();
    }
    return StakingService.instance;
  }

  /**
   * Get provider for Lisk Sepolia network
   */
  private getProvider(): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(LISK_SEPOLIA_NETWORK.rpcUrl, {
      name: LISK_SEPOLIA_NETWORK.name,
      chainId: LISK_SEPOLIA_NETWORK.chainId,
    });
  }

  private currentSigner: ethers.Wallet | null = null;

  /**
   * Connect wallet with private key (for development/testing)
   */
  // Note: connectWallet method removed - staking service now uses wallet credentials 
  // directly from secure storage via getSigner() to ensure user's actual wallet is used

  /**
   * Get signer (wallet) from secure storage or current connection
   */
  public async getSigner(): Promise<ethers.Wallet> {
    try {
      // Use current signer if available
      if (this.currentSigner) {
        return this.currentSigner;
      }

      // Try to get mnemonic first
      const mnemonic = await secureStorage.getSecureItem(MNEMONIC_KEY);
      if (mnemonic) {
        const hdWallet = ethers.Wallet.fromMnemonic(mnemonic);
        const provider = this.getProvider();
        this.currentSigner = hdWallet.connect(provider);
        return this.currentSigner;
      }

      // Fallback to private key
      const privateKey = await secureStorage.getSecureItem(PRIVATE_KEY);
      if (!privateKey) {
        throw new Error("No wallet credentials found in secure storage");
      }

      const provider = this.getProvider();
      this.currentSigner = new ethers.Wallet(privateKey, provider);
      return this.currentSigner;
    } catch (error) {
      console.error("Error getting signer:", error);
      throw new Error("Failed to access wallet credentials");
    }
  }

  /**
   * Get the staking contract instance
   */
  private async getStakingContract(): Promise<ethers.Contract> {
    const signer = await this.getSigner();
    return new ethers.Contract(
      DIAMOND_CONTRACT_ADDRESS,
      LIQUIDITY_POOL_FACET_ABI,
      signer
    );
  }

  /**
   * Get USDC token contract instance
   */
  private async getUSDCContract(): Promise<ethers.Contract> {
    const signer = await this.getSigner();
    const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
    if (!usdcAddress) {
      throw new Error("USDC address not found for Lisk Sepolia network");
    }
    
    return new ethers.Contract(usdcAddress, ERC20_ABI, signer);
  }

  /**
   * Get user's stake information
   */
  public async getStakeInfo(userAddress?: string): Promise<StakeInfo> {
    try {
      const contract = await this.getStakingContract();
      let address = userAddress;
      
      if (!address) {
        const signer = await this.getSigner();
        address = await signer.getAddress();
      }

      console.log('Getting stake info for address:', address);
      
      // Get stake data and pending rewards separately for better accuracy
      const [stakeData, pendingRewards] = await Promise.all([
        contract.getStake(address),
        contract.getPendingRewards(address)
      ]);
      
      console.log('Raw stake data:', {
        amount: stakeData.amount.toString(),
        timestamp: stakeData.timestamp.toString(),
        votingPower: stakeData.votingPower.toString(),
        active: stakeData.active,
        pendingRewardsFromStake: stakeData.pendingRewards.toString(),
        pendingRewardsFromFunction: pendingRewards.toString(),
        timeUntilUnlock: stakeData.timeUntilUnlock.toString()
      });
      
      // Use the more accurate getPendingRewards function result
      const stakeInfo = {
        amount: ethers.utils.formatUnits(stakeData.amount, 6), // USDC has 6 decimals
        timestamp: stakeData.timestamp.toNumber(),
        votingPower: ethers.utils.formatUnits(stakeData.votingPower, 6),
        active: stakeData.active,
        pendingRewards: ethers.utils.formatUnits(pendingRewards, 6), // Use separate call for accuracy
        timeUntilUnlock: stakeData.timeUntilUnlock.toNumber(),
      };
      
      console.log('Formatted stake info:', stakeInfo);
      return stakeInfo;
    } catch (error) {
      console.error("Error getting stake info:", error);
      // Return empty stake if user has no active stake
      return {
        amount: "0",
        timestamp: 0,
        votingPower: "0",
        active: false,
        pendingRewards: "0",
        timeUntilUnlock: 0,
      };
    }
  }

  /**
   * Get pool statistics
   */
  public async getPoolStats(): Promise<PoolStats> {
    try {
      const contract = await this.getStakingContract();
      const stats = await contract.getPoolStats();
      
      return {
        totalStaked: ethers.utils.formatUnits(stats.totalStaked, 6),
        totalLiquidityProviders: stats.totalLiquidityProviders.toNumber(),
        contractBalance: ethers.utils.formatUnits(stats.contractBalance, 6),
        currentRewardRate: ethers.utils.formatUnits(stats.currentRewardRate, 18),
      };
    } catch (error) {
      console.error("Error getting pool stats:", error);
      throw new Error("Failed to fetch pool statistics");
    }
  }

  /**
   * Get staking configuration
   */
  public async getStakingConfig(): Promise<StakingConfig> {
    try {
      const contract = await this.getStakingContract();
      const config = await contract.getStakingConfig();
      
      return {
        initialApr: config.initialApr.toNumber() / 100, // Convert from basis points
        currentRewardRate: ethers.utils.formatUnits(config.currentRewardRate, 18),
        minLockDuration: config.minLockDuration.toNumber(),
        aprReductionPerThousand: config.aprReductionPerThousand.toNumber(),
        emergencyWithdrawPenalty: config.emergencyWithdrawPenalty.toNumber() / 100,
        minimumStake: ethers.utils.formatUnits(config.minimumStake, 6),
      };
    } catch (error) {
      console.error("Error getting staking config:", error);
      throw new Error("Failed to fetch staking configuration");
    }
  }

  /**
   * Get user's USDC balance
   */
  public async getUSDCBalance(userAddress?: string): Promise<string> {
    try {
      const usdcContract = await this.getUSDCContract();
      let address = userAddress;
      
      if (!address) {
        const signer = await this.getSigner();
        address = await signer.getAddress();
      }

      const balance = await usdcContract.balanceOf(address);
      return ethers.utils.formatUnits(balance, 6);
    } catch (error) {
      console.error("Error getting USDC balance:", error);
      return "0";
    }
  }

  /**
   * Check if user has approved enough USDC for staking
   */
  public async checkAllowance(amount: string, userAddress?: string): Promise<boolean> {
    try {
      const usdcContract = await this.getUSDCContract();
      let address = userAddress;
      
      if (!address) {
        const signer = await this.getSigner();
        address = await signer.getAddress();
      }

      const allowance = await usdcContract.allowance(address, DIAMOND_CONTRACT_ADDRESS);
      const requiredAmount = ethers.utils.parseUnits(amount, 6);
      
      return allowance.gte(requiredAmount);
    } catch (error) {
      console.error("Error checking allowance:", error);
      return false;
    }
  }

  /**
   * Approve USDC spending for staking contract
   */
  public async approveUSDC(amount: string): Promise<StakingTransaction> {
    try {
      const usdcContract = await this.getUSDCContract();
      const amountInWei = ethers.utils.parseUnits(amount, 6);
      
      console.log("Approving USDC spend:", {
        amount,
        amountInWei: amountInWei.toString(),
        spender: DIAMOND_CONTRACT_ADDRESS,
      });

      const tx = await usdcContract.approve(DIAMOND_CONTRACT_ADDRESS, amountInWei);
      
      return {
        hash: tx.hash,
        type: 'approve',
        amount,
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
      };
    } catch (error: any) {
      console.error("Raw approve error:", error);
      throw error;
    }
  }

  /**
   * Stake USDC tokens
   */
  public async stake(amount: string): Promise<StakingTransaction> {
    try {
      // Validate amount
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Invalid stake amount");
      }

      // Check minimum stake requirement
      const config = await this.getStakingConfig();
      if (amountFloat < parseFloat(config.minimumStake)) {
        throw new Error(`Minimum stake amount is ${config.minimumStake} USDC`);
      }

      // Check USDC balance
      const balance = await this.getUSDCBalance();
      if (parseFloat(balance) < amountFloat) {
        throw new Error("Insufficient USDC balance");
      }

      // Check and handle approval
      const hasAllowance = await this.checkAllowance(amount);
      if (!hasAllowance) {
        throw new Error("Please approve USDC spending first");
      }

      const contract = await this.getStakingContract();
      const amountInWei = ethers.utils.parseUnits(amount, 6);
      
      console.log("Staking USDC:", {
        amount,
        amountInWei: amountInWei.toString(),
      });

      const tx = await contract.stake(amountInWei);
      
      return {
        hash: tx.hash,
        type: 'stake',
        amount,
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
      };
    } catch (error: any) {
      console.error("Raw stake error:", error);
      throw error;
    }
  }

  /**
   * Unstake tokens
   */
  public async unstake(amount: string): Promise<StakingTransaction> {
    try {
      // Validate amount
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Invalid unstake amount");
      }

      const contract = await this.getStakingContract();
      const signer = await this.getSigner();
      const address = await signer.getAddress();
      const amountInWei = ethers.utils.parseUnits(amount, 6);
      
      console.log("Unstaking USDC:", {
        amount,
        amountInWei: amountInWei.toString(),
        address
      });
      
      // Check current stake first
      const stakeData = await contract.getStake(address);
      console.log('Current stake before unstaking:', {
        amount: stakeData.amount.toString(),
        active: stakeData.active,
        timeUntilUnlock: stakeData.timeUntilUnlock.toString()
      });

      // Try to unstake with manual gas limit
      const gasLimit = ethers.utils.hexlify(300000); // 300k gas limit
      const tx = await contract.unstake(amountInWei, { gasLimit });
      
      return {
        hash: tx.hash,
        type: 'unstake',
        amount,
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
      };
    } catch (error: any) {
      console.error("Raw unstake error:", error);
      throw error;
    }
  }

  /**
   * Claim pending rewards
   */
  public async claimRewards(): Promise<StakingTransaction> {
    try {
      const contract = await this.getStakingContract();
      const signer = await this.getSigner();
      const address = await signer.getAddress();
      
      console.log("Attempting to claim rewards...");
      
      // Log the function selector we're calling
      const claimRewardsSelector = ethers.utils.id("claimRewards()").slice(0, 10);
      console.log("claimRewards function selector:", claimRewardsSelector);
      
      // Check pending rewards first (for logging only)
      try {
        const pendingRewards = await contract.getPendingRewards(address);
        console.log('Pending rewards check:', {
          address,
          pendingRewards: pendingRewards.toString(),
          formatted: ethers.utils.formatUnits(pendingRewards, 6)
        });
      } catch (pendingError) {
        console.log('Could not check pending rewards:', pendingError);
      }

      // Check stake state before attempting to claim
      const stakeData = await contract.getStake(address);
      console.log('Stake state before claiming rewards:', {
        active: stakeData.active,
        amount: stakeData.amount.toString(),
        timeUntilUnlock: stakeData.timeUntilUnlock.toString(),
        unlockTime: stakeData.timeUntilUnlock.gt(0) ? 
          `${Math.ceil(stakeData.timeUntilUnlock.toNumber() / 86400)} days remaining` : 'Unlocked'
      });

      // Try to claim regardless of state
      const gasLimit = ethers.utils.hexlify(200000); // 200k gas limit
      const tx = await contract.claimRewards({ gasLimit });
      
      console.log("Claim rewards transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'claim',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
      };
    } catch (error: any) {
      console.error("Raw claim rewards error:", error);
      throw error;
    }
  }

  /**
   * Emergency withdraw (with penalty)
   */
  public async emergencyWithdraw(): Promise<StakingTransaction> {
    try {
      const contract = await this.getStakingContract();
      const signer = await this.getSigner();
      const address = await signer.getAddress();
      
      console.log("Attempting emergency withdrawal...");
      
      // Check current stake first
      const stakeData = await contract.getStake(address);
      console.log('Current stake before emergency withdrawal:', {
        amount: stakeData.amount.toString(),
        active: stakeData.active,
        timeUntilUnlock: stakeData.timeUntilUnlock.toString()
      });
      
      if (!stakeData.active || stakeData.amount.eq(0)) {
        throw new Error("No active stake found for emergency withdrawal");
      }
      
      // Try with manual gas limit to avoid estimation issues
      const gasLimit = ethers.utils.hexlify(250000); // 250k gas limit
      const tx = await contract.emergencyWithdraw({ gasLimit });
      
      console.log("Emergency withdrawal transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'emergency',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
      };
    } catch (error: any) {
      console.error("Raw emergency withdraw error:", error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  public async waitForTransaction(txHash: string): Promise<ethers.providers.TransactionReceipt> {
    try {
      const provider = this.getProvider();
      console.log(`Waiting for transaction ${txHash}...`);
      
      const receipt = await provider.waitForTransaction(txHash, 1);
      
      console.log('Transaction receipt:', {
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
        logs: receipt.logs.length,
        transactionHash: receipt.transactionHash
      });
      
      if (receipt.status === 0) {
        console.error('Transaction failed on-chain, receipt:', receipt);
      }
      
      return receipt;
    } catch (error) {
      console.error("Error waiting for transaction:", error);
      throw error; // Throw raw error for debugging
    }
  }

  /**
   * Get detailed transaction failure info
   */
  public async getTransactionFailureReason(txHash: string): Promise<string | null> {
    try {
      const provider = this.getProvider();
      const tx = await provider.getTransaction(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!tx || !receipt) {
        return "Transaction not found";
      }
      
      if (receipt.status === 1) {
        return null; // Transaction succeeded
      }
      
      console.log('Failed transaction details:', {
        tx,
        receipt,
        gasUsed: receipt.gasUsed.toString(),
        gasLimit: tx.gasLimit?.toString()
      });
      
      // Try to get revert reason by replaying the transaction
      try {
        // Clean transaction object for replay
        const cleanTx = {
          to: tx.to,
          from: tx.from,
          data: tx.data,
          value: tx.value,
          gasLimit: tx.gasLimit
        };
        
        console.log('Replaying transaction with clean object:', cleanTx);
        await provider.call(cleanTx, tx.blockNumber);
        return "Transaction succeeded in replay but failed on-chain - possible state dependency";
      } catch (callError: any) {
        console.log('Transaction replay error:', callError);
        
        // Extract error data if available
        if (callError.data) {
          console.log('Error data:', callError.data);
        }
        
        // Check for specific error patterns
        if (callError.message?.includes("execution reverted")) {
          return `Contract execution reverted. Possible reasons: insufficient rewards, tokens locked, or contract state changed. Error: ${callError.reason || 'No reason provided'}`;
        }
        
        return callError.reason || callError.message || "Contract execution reverted without reason";
      }
    } catch (error: any) {
      console.error("Error getting failure reason:", error);
      return "Could not determine failure reason";
    }
  }

  /**
   * Get transaction status
   */
  public async getTransactionStatus(txHash: string): Promise<'pending' | 'confirmed' | 'failed'> {
    try {
      const provider = this.getProvider();
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return 'pending';
      }
      
      return receipt.status === 1 ? 'confirmed' : 'failed';
    } catch (error) {
      console.error("Error getting transaction status:", error);
      return 'failed';
    }
  }

  /**
   * Calculate estimated APR based on current conditions
   */
  public async calculateCurrentAPR(): Promise<number> {
    try {
      const config = await this.getStakingConfig();
      const poolStats = await this.getPoolStats();
      
      // Calculate APR reduction based on total staked amount
      const totalStaked = parseFloat(poolStats.totalStaked);
      const reductionThousands = Math.floor(totalStaked / 1000);
      const aprReduction = reductionThousands * config.aprReductionPerThousand;
      
      const currentAPR = Math.max(
        config.initialApr - aprReduction / 100,
        1 // Minimum 1% APR
      );
      
      return currentAPR;
    } catch (error) {
      console.error("Error calculating current APR:", error);
      return 0;
    }
  }

  /**
   * Estimate gas cost for a transaction
   */
  public async estimateGasCost(
    action: 'approve' | 'stake' | 'unstake' | 'claim' | 'emergency',
    amount?: string
  ): Promise<string> {
    try {
      const signer = await this.getSigner();
      let gasLimit: ethers.BigNumber;

      switch (action) {
        case 'approve': {
          if (!amount) throw new Error("Amount required for approval");
          const usdcContract = await this.getUSDCContract();
          const amountInWei = ethers.utils.parseUnits(amount, 6);
          gasLimit = await usdcContract.estimateGas.approve(DIAMOND_CONTRACT_ADDRESS, amountInWei);
          break;
        }
        case 'stake': {
          if (!amount) throw new Error("Amount required for staking");
          const contract = await this.getStakingContract();
          const amountInWei = ethers.utils.parseUnits(amount, 6);
          gasLimit = await contract.estimateGas.stake(amountInWei);
          break;
        }
        case 'unstake': {
          if (!amount) throw new Error("Amount required for unstaking");
          const contract = await this.getStakingContract();
          const amountInWei = ethers.utils.parseUnits(amount, 6);
          gasLimit = await contract.estimateGas.unstake(amountInWei);
          break;
        }
        case 'claim': {
          const contract = await this.getStakingContract();
          gasLimit = await contract.estimateGas.claimRewards();
          break;
        }
        case 'emergency': {
          const contract = await this.getStakingContract();
          gasLimit = await contract.estimateGas.emergencyWithdraw();
          break;
        }
        default:
          throw new Error("Invalid action");
      }

      // Add 20% buffer
      gasLimit = gasLimit.mul(120).div(100);

      const provider = signer.provider as ethers.providers.JsonRpcProvider;
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.utils.parseUnits("20", "gwei");
      
      const totalCost = gasLimit.mul(gasPrice);
      return ethers.utils.formatEther(totalCost);
    } catch (error) {
      console.error("Error estimating gas cost:", error);
      return "0.001"; // Default estimate
    }
  }
}

export const stakingService = StakingService.getInstance();
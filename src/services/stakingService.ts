/**
 * Staking Service
 * 
 * Handles all interactions with the BlockFinax Diamond Contract Staking System
 * Integrates with LiquidityPoolFacet for staking, unstaking, and rewards management
 * 
 * Account Abstraction Support:
 * - Uses SmartContractTransactionService for unified AA+EOA transaction handling
 * - Automatically links smart account to EOA on first transaction
 * - Batch transactions (approve + stake in single UserOp) for gasless operations
 * - Automatic fallback to EOA when AA unavailable, gas limits reached, or network unsupported
 * - Contract-level address resolution ensures single identity (EOA) across both transaction methods
 */

import { WalletNetwork } from "@/contexts/WalletContext";
import { secureStorage } from "@/utils/secureStorage";
import { ethers } from "ethers";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { isAlchemyNetworkSupported } from "@/config/alchemyAccount";
import { AlchemyAccountService } from "@/services/alchemyAccountService";
import { smartContractTransactionService } from "@/services/smartContractTransactionService";
import { Hex, encodeFunctionData } from "viem";

// Contract Configuration - Diamond addresses by chain ID
export const DIAMOND_ADDRESSES: { [chainId: number]: string } = {
  11155111: "0xA4d19a7b133d2A9fAce5b1ad407cA7b9D4Ee9284", // Ethereum Sepolia
  4202: "0xE133CD2eE4d835AC202942Baff2B1D6d47862d34", // Lisk Sepolia
  84532: "0xb899A968e785dD721dbc40e71e2FAEd7B2d84711", // Base Sepolia
};

// Default to Lisk Sepolia for backward compatibility
export const DIAMOND_CONTRACT_ADDRESS = DIAMOND_ADDRESSES[4202];

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

// LiquidityPoolFacet ABI (Multi-token support with ALL functions)
const LIQUIDITY_POOL_FACET_ABI = [
  {"inputs":[],"name":"BelowMinimumStake","type":"error"},
  {"inputs":[],"name":"ContractPaused","type":"error"},
  {"inputs":[],"name":"ExcessiveAmount","type":"error"},
  {"inputs":[],"name":"FinanciersCannotEmergencyWithdraw","type":"error"},
  {"inputs":[],"name":"InsufficientAllowance","type":"error"},
  {"inputs":[],"name":"InsufficientBalance","type":"error"},
  {"inputs":[],"name":"InsufficientStakedAmount","type":"error"},
  {"inputs":[],"name":"InvalidAPR","type":"error"},
  {"inputs":[],"name":"InvalidDeadline","type":"error"},
  {"inputs":[],"name":"InvalidLockDuration","type":"error"},
  {"inputs":[],"name":"InvalidPenalty","type":"error"},
  {"inputs":[],"name":"InvalidTokenAddress","type":"error"},
  {"inputs":[],"name":"InvalidVotingPower","type":"error"},
  {"inputs":[],"name":"LockDurationNotMet","type":"error"},
  {"inputs":[],"name":"NoActiveStake","type":"error"},
  {"inputs":[],"name":"NoRewardsToCllaim","type":"error"},
  {"inputs":[],"name":"NotContractOwner","type":"error"},
  {"inputs":[],"name":"NothingToUnstake","type":"error"},
  {"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},
  {"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},
  {"inputs":[],"name":"StakerNotActive","type":"error"},
  {"inputs":[],"name":"TransferFailed","type":"error"},
  {"inputs":[],"name":"ZeroAmount","type":"error"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"CustomDeadlineSet","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"}],"name":"EmergencyWithdrawn","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"bool","name":"isFinancier","type":"bool"}],"name":"FinancierStatusChanged","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"oldRate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newRate","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalStaked","type":"uint256"}],"name":"RewardRateUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsClaimed","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardsDistributed","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"votingPower","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"currentApr","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"deadline","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isFinancier","type":"bool"}],"name":"Staked","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"parameter","type":"string"},{"indexed":false,"internalType":"uint256","name":"oldValue","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newValue","type":"uint256"}],"name":"StakingConfigUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"staker","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"rewards","type":"uint256"}],"name":"Unstaked","type":"event"},
  // Multi-token staking functions
  {"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"customDeadline","type":"uint256"},{"internalType":"uint256","name":"usdEquivalent","type":"uint256"}],"name":"stakeToken","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"customDeadline","type":"uint256"},{"internalType":"uint256","name":"usdEquivalent","type":"uint256"}],"name":"stakeTokenAsFinancier","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"unstakeToken","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"claimTokenRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"emergencyWithdrawToken","outputs":[],"stateMutability":"nonpayable","type":"function"},
  // Financier functions
  {"inputs":[],"name":"applyAsFinancier","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"newDeadline","type":"uint256"}],"name":"setCustomDeadline","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isFinancier","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  // Multi-token view functions
  {"inputs":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"getStakeForToken","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"usdEquivalent","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"financierStatus","type":"bool"},{"internalType":"uint256","name":"pendingRewards","type":"uint256"},{"internalType":"uint256","name":"votingPower","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getAllStakesForUser","outputs":[{"internalType":"address[]","name":"tokens","type":"address[]"},{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"uint256[]","name":"usdEquivalents","type":"uint256[]"},{"internalType":"bool[]","name":"isFinancierFlags","type":"bool[]"},{"internalType":"uint256[]","name":"deadlines","type":"uint256[]"},{"internalType":"uint256[]","name":"pendingRewards","type":"uint256[]"},{"internalType":"uint256","name":"totalUsdValue","type":"uint256"}],"stateMutability":"view","type":"function"},
  // Legacy view functions (backward compatibility)
  {"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getStake","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"votingPower","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"pendingRewards","type":"uint256"},{"internalType":"uint256","name":"timeUntilUnlock","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bool","name":"financierStatus","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getPendingRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getFinanciers","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getStakers","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getStakingConfig","outputs":[{"internalType":"uint256","name":"initialApr","type":"uint256"},{"internalType":"uint256","name":"currentRewardRate","type":"uint256"},{"internalType":"uint256","name":"minLockDuration","type":"uint256"},{"internalType":"uint256","name":"aprReductionPerThousand","type":"uint256"},{"internalType":"uint256","name":"emergencyWithdrawPenalty","type":"uint256"},{"internalType":"uint256","name":"minimumStake","type":"uint256"},{"internalType":"uint256","name":"minimumFinancierStake","type":"uint256"},{"internalType":"uint256","name":"minFinancierLockDuration","type":"uint256"},{"internalType":"uint256","name":"minNormalStakerLockDuration","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"staker","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"distributeRewards","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

// GovernanceFacet ABI
const GOVERNANCE_FACET_ABI = [
  {"inputs":[],"name":"AlreadyVoted","type":"error"},
  {"inputs":[],"name":"ContractPaused","type":"error"},
  {"inputs":[],"name":"InsufficientStake","type":"error"},
  {"inputs":[],"name":"InvalidCategory","type":"error"},
  {"inputs":[],"name":"InvalidDescription","type":"error"},
  {"inputs":[],"name":"InvalidProposalId","type":"error"},
  {"inputs":[],"name":"InvalidTitle","type":"error"},
  {"inputs":[],"name":"NoRevocationRequested","type":"error"},
  {"inputs":[],"name":"NotAFinancier","type":"error"},
  {"inputs":[],"name":"ProposalAlreadyExecuted","type":"error"},
  {"inputs":[],"name":"ProposalNotActive","type":"error"},
  {"inputs":[],"name":"ProposalNotFound","type":"error"},
  {"inputs":[],"name":"RevocationAlreadyRequested","type":"error"},
  {"inputs":[],"name":"RevocationPeriodNotMet","type":"error"},
  {"inputs":[],"name":"VotingPeriodEnded","type":"error"},
  {"inputs":[],"name":"VotingPeriodNotEnded","type":"error"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"financier","type":"address"},{"indexed":false,"internalType":"uint256","name":"requestTime","type":"uint256"}],"name":"FinancierRevocationCancelled","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"financier","type":"address"},{"indexed":false,"internalType":"uint256","name":"completionTime","type":"uint256"}],"name":"FinancierRevocationCompleted","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"financier","type":"address"},{"indexed":false,"internalType":"uint256","name":"requestTime","type":"uint256"}],"name":"FinancierRevocationRequested","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"proposalId","type":"string"},{"indexed":true,"internalType":"string","name":"category","type":"string"},{"indexed":true,"internalType":"string","name":"title","type":"string"},{"indexed":false,"internalType":"address","name":"proposer","type":"address"},{"indexed":false,"internalType":"uint256","name":"votingDeadline","type":"uint256"}],"name":"ProposalCreated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"proposalId","type":"string"},{"indexed":false,"internalType":"address","name":"executor","type":"address"}],"name":"ProposalExecuted","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"proposalId","type":"string"},{"indexed":false,"internalType":"enum LibAppStorage.ProposalStatus","name":"newStatus","type":"uint8"}],"name":"ProposalStatusChanged","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"proposalId","type":"string"},{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"bool","name":"support","type":"bool"},{"indexed":false,"internalType":"uint256","name":"votingPower","type":"uint256"}],"name":"ProposalVoteCast","type":"event"},
  {"inputs":[{"internalType":"string","name":"proposalId","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"description","type":"string"}],"name":"createProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"string","name":"proposalId","type":"string"}],"name":"executeProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"string","name":"proposalId","type":"string"}],"name":"finalizeVote","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"getActiveProposals","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getAllProposals","outputs":[{"internalType":"string[]","name":"","type":"string[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getDAOConfig","outputs":[{"internalType":"uint256","name":"minimumFinancierStake","type":"uint256"},{"internalType":"uint256","name":"votingDuration","type":"uint256"},{"internalType":"uint256","name":"approvalThreshold","type":"uint256"},{"internalType":"uint256","name":"revocationPeriod","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getDAOStats","outputs":[{"internalType":"uint256","name":"totalProposals","type":"uint256"},{"internalType":"uint256","name":"activeProposals","type":"uint256"},{"internalType":"uint256","name":"passedProposals","type":"uint256"},{"internalType":"uint256","name":"executedProposals","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"proposalId","type":"string"}],"name":"getProposal","outputs":[{"internalType":"address","name":"proposer","type":"address"},{"internalType":"string","name":"category","type":"string"},{"internalType":"string","name":"title","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"uint256","name":"votesFor","type":"uint256"},{"internalType":"uint256","name":"votesAgainst","type":"uint256"},{"internalType":"uint256","name":"createdAt","type":"uint256"},{"internalType":"uint256","name":"votingDeadline","type":"uint256"},{"internalType":"enum LibAppStorage.ProposalStatus","name":"status","type":"uint8"},{"internalType":"bool","name":"executed","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"staker","type":"address"}],"name":"getRevocationStatus","outputs":[{"internalType":"bool","name":"revocationRequested","type":"bool"},{"internalType":"uint256","name":"revocationRequestTime","type":"uint256"},{"internalType":"uint256","name":"revocationDeadline","type":"uint256"},{"internalType":"bool","name":"canCompleteRevocation","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"proposalId","type":"string"},{"internalType":"address","name":"voter","type":"address"}],"name":"getVoteStatus","outputs":[{"internalType":"bool","name":"hasVoted","type":"bool"},{"internalType":"bool","name":"support","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"requestFinancierRevocation","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"cancelFinancierRevocation","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"completeFinancierRevocation","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"string","name":"proposalId","type":"string"},{"internalType":"bool","name":"support","type":"bool"}],"name":"voteOnProposal","outputs":[],"stateMutability":"nonpayable","type":"function"}
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

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface StakeInfo {
  amount: string;
  timestamp: number;
  votingPower: string;
  active: boolean;
  pendingRewards: string;
  timeUntilUnlock: number;
  deadline: number;
  isFinancier: boolean;
}

export interface TokenStakeInfo {
  tokenAddress: string;
  amount: string;
  timestamp: number;
  active: boolean;
  usdEquivalent: string;
  deadline: number;
  isFinancier: boolean;
  pendingRewards: string;
  votingPower: string;
}

export interface AllStakesInfo {
  tokens: string[];
  amounts: string[];
  usdEquivalents: string[];
  isFinancierFlags: boolean[];
  deadlines: number[];
  pendingRewards: string[];
  totalUsdValue: string;
}

export interface RevocationStatus {
  revocationRequested: boolean;
  revocationRequestTime: number;
  revocationDeadline: number;
  canCompleteRevocation: boolean;
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
  minimumFinancierStake: string;
  minFinancierLockDuration: number;
  minNormalStakerLockDuration: number;
}

export interface StakingTransaction {
  hash: string;
  type: 'approve' | 'stake' | 'unstake' | 'claim' | 'emergency' | 'proposal' | 'vote' | 'revocation';
  amount?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  explorerUrl?: string;
  usedAA?: boolean; // Whether Account Abstraction was used for the transaction
}

export interface Proposal {
  id: string;
  proposer: string;
  category: string;
  title: string;
  description: string;
  votesFor: string;
  votesAgainst: string;
  createdAt: number;
  votingDeadline: number;
  status: 'Active' | 'Passed' | 'Rejected' | 'Executed';
  executed: boolean;
}

export interface DAOConfig {
  minimumFinancierStake: string;
  votingDuration: number;
  approvalThreshold: number;
  revocationPeriod: number;
}

export interface DAOStats {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  executedProposals: number;
}

export interface VoteStatus {
  hasVoted: boolean;
  support: boolean;
}

class StakingService {
  private static instance: StakingService;
  private currentChainId: number = 4202; // Default to Lisk Sepolia
  private currentNetworkConfig: WalletNetwork = LISK_SEPOLIA_NETWORK;

  public static getInstance(): StakingService {
    if (!StakingService.instance) {
      StakingService.instance = new StakingService();
    }
    return StakingService.instance;
  }

  /**
   * Set current network - should be called when user switches networks
   */
  public setNetwork(chainId: number, networkConfig?: WalletNetwork): void {
    this.currentChainId = chainId;
    if (networkConfig) {
      this.currentNetworkConfig = networkConfig;
    }
    // Clear cached signer when network changes
    this.currentSigner = null;
    console.log(`[StakingService] Network switched to chainId: ${chainId}`);
  }

  /**
   * Get current network chainId
   */
  public getCurrentChainId(): number {
    return this.currentChainId;
  }

  /**
   * Get Diamond address for current network
   */
  private getDiamondAddress(): string {
    const address = DIAMOND_ADDRESSES[this.currentChainId];
    if (!address) {
      throw new Error(`No Diamond contract deployed on network ${this.currentChainId}`);
    }
    return address;
  }

  /**
   * Get provider for current network
   */
  private getProvider(): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(this.currentNetworkConfig.rpcUrl, {
      name: this.currentNetworkConfig.name,
      chainId: this.currentNetworkConfig.chainId,
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

      // Fallback to encrypted private key
      const password = await secureStorage.getSecureItem('blockfinax.password');
      if (!password) {
        throw new Error("Password not found in secure storage");
      }

      const privateKey = await secureStorage.getDecryptedPrivateKey(password);
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
   * Check if Account Abstraction should be used for staking operations
   */
  private shouldUseAA(): boolean {
    // Check feature flag
    if (!FEATURE_FLAGS.USE_ALCHEMY_AA) {
      return false;
    }

    // Check if Lisk Sepolia is supported by Alchemy (currently it's not, so will fallback to EOA)
    // This check ensures graceful degradation
    if (!isAlchemyNetworkSupported(LISK_SEPOLIA_NETWORK.id)) {
      console.log('[StakingService] AA not supported on Lisk Sepolia, using EOA');
      return false;
    }

    return true;
  }

  /**
   * Initialize Alchemy Account Service for contract interactions
   */
  private async initializeAA(): Promise<AlchemyAccountService | null> {
    try {
      const password = await secureStorage.getSecureItem('blockfinax.password');
      if (!password) {
        throw new Error("Password not found for AA");
      }

      const privateKey = await secureStorage.getDecryptedPrivateKey(password);
      if (!privateKey) {
        throw new Error("No private key found for AA");
      }

      const alchemyService = new AlchemyAccountService(LISK_SEPOLIA_NETWORK.id);
      await alchemyService.initializeSmartAccount(privateKey);

      return alchemyService;
    } catch (error) {
      console.error('[StakingService] Failed to initialize AA:', error);
      return null;
    }
  }

  /**
   * Get the smart account address for the current user
   * This ensures consistent identity regardless of EOA vs AA transaction method
   * 
   * IMPORTANT: With contract upgrade, the contract now auto-resolves Smart Account → EOA
   * This method returns the smart account address, and the contract handles resolution.
   * 
   * CRITICAL: All contract state queries can now use either EOA or Smart Account address
   * The contract will automatically resolve to the primary identity (EOA).
   */
  private async getSmartAccountAddress(): Promise<string> {
    try {
      // Try to get from AA service first (if AA is enabled)
      if (this.shouldUseAA()) {
        const alchemyService = await this.initializeAA();
        if (alchemyService) {
          const smartAccountAddr = alchemyService.getAccountAddress();
          if (smartAccountAddr) {
            console.log('[StakingService] Using smart account address:', smartAccountAddr);
            return smartAccountAddr;
          }
        }
      }
      
      // Fallback: Use EOA address
      const signer = await this.getSigner();
      const eoaAddress = await signer.getAddress();
      console.log('[StakingService] Using EOA address:', eoaAddress);
      return eoaAddress;
    } catch (error) {
      console.error('[StakingService] Error getting address:', error);
      // Last resort fallback to EOA
      const signer = await this.getSigner();
      return await signer.getAddress();
    }
  }

  /**
   * Get the staking contract instance for current network
   */
  private async getStakingContract(): Promise<ethers.Contract> {
    const signer = await this.getSigner();
    const diamondAddress = this.getDiamondAddress();
    console.log(`[StakingService] Using Diamond at ${diamondAddress} on chain ${this.currentChainId}`);
    return new ethers.Contract(
      diamondAddress,
      LIQUIDITY_POOL_FACET_ABI,
      signer
    );
  }

  /**
   * Get the governance contract instance for current network
   */
  private async getGovernanceContract(): Promise<ethers.Contract> {
    const signer = await this.getSigner();
    const diamondAddress = this.getDiamondAddress();
    return new ethers.Contract(
      diamondAddress,
      GOVERNANCE_FACET_ABI,
      signer
    );
  }

  /**
   * Get USDC token contract instance for current network
   */
  private async getUSDCContract(): Promise<ethers.Contract> {
    const signer = await this.getSigner();
    const usdcAddress = this.currentNetworkConfig.stablecoins?.[0]?.address;
    if (!usdcAddress) {
      throw new Error(`USDC address not found for network ${this.currentNetworkConfig.name}`);
    }
    
    return new ethers.Contract(usdcAddress, ERC20_ABI, signer);
  }

  /**
   * Get user's stake information
   * Uses smart account address to ensure consistent identity
   */
  public async getStakeInfo(userAddress?: string): Promise<StakeInfo> {
    try {
      const contract = await this.getStakingContract();
      let address = userAddress;
      
      if (!address) {
        // CRITICAL: Use smart account address for queries
        address = await this.getSmartAccountAddress();
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
        timeUntilUnlock: stakeData.timeUntilUnlock.toString(),
        deadline: stakeData.deadline.toString(),
        isFinancier: stakeData.isFinancier
      });
      
      // Use the more accurate getPendingRewards function result
      const stakeInfo = {
        amount: ethers.utils.formatUnits(stakeData.amount, 6), // USDC has 6 decimals
        timestamp: stakeData.timestamp.toNumber(),
        votingPower: ethers.utils.formatUnits(stakeData.votingPower, 6),
        active: stakeData.active,
        pendingRewards: ethers.utils.formatUnits(pendingRewards, 6), // Use separate call for accuracy
        timeUntilUnlock: stakeData.timeUntilUnlock.toNumber(),
        deadline: stakeData.deadline.toNumber(),
        isFinancier: stakeData.isFinancier,
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
        deadline: 0,
        isFinancier: false,
      };
    }
  }

  /**
   * Get staking configuration
   */
  public async getStakingConfig(): Promise<StakingConfig> {
    try {
      const contract = await this.getStakingContract();
      const config = await contract.getStakingConfig();
      
      console.log("🔧 [FIXED VERSION] getStakingConfig - All raw values:");
      console.log("🔧 initialApr:", config.initialApr.toString());
      console.log("🔧 currentRewardRate:", config.currentRewardRate.toString());
      console.log("🔧 minLockDuration:", config.minLockDuration.toString());
      console.log("🔧 aprReductionPerThousand:", config.aprReductionPerThousand.toString());
      console.log("🔧 emergencyWithdrawPenalty:", config.emergencyWithdrawPenalty.toString());
      console.log("🔧 minimumStake:", config.minimumStake.toString());
      console.log("🔧 minimumFinancierStake:", config.minimumFinancierStake.toString());
      console.log("🔧 minFinancierLockDuration:", config.minFinancierLockDuration.toString());
      console.log("🔧 minNormalStakerLockDuration:", config.minNormalStakerLockDuration.toString());
      
      const result = {
        // initialApr is stored with 18 decimals in contract (e.g., 1200 * 10^18 for 12%)
        initialApr: parseFloat(ethers.utils.formatEther(config.initialApr)) / 100,
        currentRewardRate: ethers.utils.formatUnits(config.currentRewardRate, 18),
        // Duration values are stored with 18 decimals in contract, need to convert
        minLockDuration: parseInt(ethers.utils.formatEther(config.minLockDuration)),
        // APR reduction and penalty are also stored with 18 decimals
        aprReductionPerThousand: parseInt(ethers.utils.formatEther(config.aprReductionPerThousand)),
        emergencyWithdrawPenalty: parseFloat(ethers.utils.formatEther(config.emergencyWithdrawPenalty)) / 100,
        // minimumStake is stored as USD equivalent with 18 decimals (ethers.parseEther)
        minimumStake: ethers.utils.formatEther(config.minimumStake),
        minimumFinancierStake: ethers.utils.formatEther(config.minimumFinancierStake),
        // Lock durations are also stored with 18 decimals
        minFinancierLockDuration: parseInt(ethers.utils.formatEther(config.minFinancierLockDuration)),
        minNormalStakerLockDuration: parseInt(ethers.utils.formatEther(config.minNormalStakerLockDuration)),
      };
      
      console.log("🔧 Formatted result:", JSON.stringify(result, null, 2));
      return result;
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

      const allowance = await usdcContract.allowance(address, this.getDiamondAddress());
      const requiredAmount = ethers.utils.parseUnits(amount, 6);
      
      return allowance.gte(requiredAmount);
    } catch (error) {
      console.error("Error checking allowance:", error);
      return false;
    }
  }

  /**
   * Approve USDC spending for staking contract (standalone - use stake() instead for combined flow)
   * @deprecated Use stake() method instead which handles approval automatically
   */
  public async approveUSDC(amount: string): Promise<StakingTransaction> {
    try {
      const usdcContract = await this.getUSDCContract();
      const amountInWei = ethers.utils.parseUnits(amount, 6);
      
      console.log("Approving USDC spend:", {
        amount,
        amountInWei: amountInWei.toString(),
        spender: this.getDiamondAddress(),
      });

      const tx = await usdcContract.approve(this.getDiamondAddress(), amountInWei);
      
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
   * Stake USDC tokens (includes approval if needed)
   * Returns transaction with progress stages
   * 
   * AA Enhancement: Uses SmartContractTransactionService for unified AA+EOA handling
   * - Automatically links smart account to EOA on first transaction
   * - Batch approve+stake in single UserOp when using AA
   * - Falls back to EOA when AA unavailable or gas limits reached
   */
  public async stake(
    amount: string, 
    onProgress?: (stage: 'checking' | 'approving' | 'staking' | 'batching' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      // Validate amount
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Invalid stake amount");
      }

      onProgress?.('checking', 'Checking staking requirements...');

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

      const amountInWei = ethers.utils.parseUnits(amount, 6);

      // Get USDC contract address
      const usdcAddress = this.getDefaultTokenAddress();

      // Check if should use AA
      if (this.shouldUseAA()) {
        try {
          onProgress?.('batching', 'Preparing gasless batch transaction...');
          
          // Get private key for linking/fallback
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          const txService = smartContractTransactionService;
          
          // Execute batch transaction (approve + stake) with AA
          const result = await txService.executeBatchTransaction({
            transactions: [
              {
                contractAddress: usdcAddress,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [this.getDiamondAddress(), amountInWei.toString()],
                value: '0'
              },
              {
                contractAddress: this.getDiamondAddress(),
                abi: LIQUIDITY_POOL_FACET_ABI,
                functionName: 'stake',
                args: [amountInWei.toString(), '0']
              }
            ],
            network: LISK_SEPOLIA_NETWORK,
            privateKey
          });

          console.log('[StakingService] AA batch stake completed:', result);

          return {
            hash: result.txHash,
            type: 'stake',
            amount,
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA batch transaction failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method: Check and handle approval if needed
      const hasAllowance = await this.checkAllowance(amount);
      if (!hasAllowance) {
        onProgress?.('approving', 'Approving USDC spend...');
        
        const usdcContract = await this.getUSDCContract();
        console.log("Approving USDC spend:", {
          amount,
          amountInWei: amountInWei.toString(),
          spender: this.getDiamondAddress(),
        });

        const approveTx = await usdcContract.approve(this.getDiamondAddress(), amountInWei);
        console.log("Approval transaction:", approveTx.hash);
        
        onProgress?.('approving', `Waiting for approval confirmation...`);
        await approveTx.wait();
        console.log("Approval confirmed");
      }

      onProgress?.('staking', 'Staking USDC...');

      const contract = await this.getStakingContract();
      
      console.log("Staking USDC:", {
        amount,
        amountInWei: amountInWei.toString(),
        contractAddress: this.getDiamondAddress(),
        usdcAddress, // already declared at function scope
        customDeadline: 0 // 0 means auto-calculate based on lock duration
      });

      // Add manual gas limit to avoid estimation errors
      const gasLimit = ethers.utils.hexlify(400000); // 400k gas limit
      // Multi-token signature: stakeToken(address tokenAddress, uint256 amount, uint256 customDeadline, uint256 usdEquivalent)
      // For USDC with 6 decimals, 1 USDC = 1 USD, so usdEquivalent = amount
      const tx = await contract.stakeToken(usdcAddress, amountInWei, 0, amountInWei, { gasLimit });
      
      console.log("Stake transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'stake',
        amount,
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw stake error:", error);
      throw error;
    }
  }

  /**
   * Stake via Account Abstraction with batch transaction
   * Combines approve + stake in single UserOp for gasless operation
   */
  private async stakeViaAA(
    amount: string,
    amountInWei: ethers.BigNumber,
    onProgress?: (stage: 'checking' | 'approving' | 'staking' | 'batching', message: string) => void
  ): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    onProgress?.('batching', 'Submitting gasless batch transaction...');

    // Get USDC contract address
    const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
    if (!usdcAddress) {
      throw new Error('USDC address not found');
    }

    console.log('[StakingService] Executing AA batch stake:', {
      amount,
      amountInWei: amountInWei.toString(),
      usdcAddress,
      stakingContract: this.getDiamondAddress(),
      accountAddress
    });

    // Execute batch transaction via AA
    const result = await alchemyService.sendBatchUserOperation([
      {
        target: usdcAddress as Hex,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [this.getDiamondAddress() as Hex, BigInt(amountInWei.toString())]
        }),
        value: BigInt(0)
      },
      {
        target: this.getDiamondAddress() as Hex,
        data: encodeFunctionData({
          abi: LIQUIDITY_POOL_FACET_ABI,
          functionName: 'stakeToken',
          // stakeToken(address tokenAddress, uint256 amount, uint256 customDeadline, uint256 usdEquivalent)
          args: [usdcAddress as Hex, BigInt(amountInWei.toString()), BigInt(0), BigInt(amountInWei.toString())]
        }),
        value: BigInt(0)
      }
    ]);

    console.log('[StakingService] AA batch stake submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'stake',
      amount,
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
  }

  /**
   * Unstake tokens
   * Uses SmartContractTransactionService for unified AA+EOA handling
   */
  public async unstake(
    amount: string,
    onProgress?: (stage: 'checking' | 'unstaking' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      // Validate amount
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Invalid unstake amount");
      }

      onProgress?.('checking', 'Checking unstaking requirements...');

      const amountInWei = ethers.utils.parseUnits(amount, 6);

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA unstake');
          
          // Get private key for linking/fallback
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          const txService = smartContractTransactionService;
          
          // Get USDC token address
          const usdcTokenAddress = this.getDefaultTokenAddress();
          
          // Execute unstake transaction with AA
          const result = await txService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: LIQUIDITY_POOL_FACET_ABI,
            functionName: 'unstakeToken',
            args: [usdcTokenAddress, amountInWei.toString()]
          });

          console.log('[StakingService] AA unstake completed:', result);

          return {
            hash: result.txHash,
            type: 'unstake',
            amount,
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA unstake failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method
      onProgress?.('unstaking', 'Unstaking tokens...');
      
      const contract = await this.getStakingContract();
      const signer = await this.getSigner();
      const address = await signer.getAddress();
      
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

      // Get USDC token address for multi-token unstaking (reuse from AA section if available, or get new)
      const usdcAddress = this.getDefaultTokenAddress();

      // Try to unstake with manual gas limit
      const gasLimit = ethers.utils.hexlify(300000); // 300k gas limit
      // Multi-token signature: unstakeToken(address tokenAddress, uint256 amount)
      const tx = await contract.unstakeToken(usdcAddress, amountInWei, { gasLimit });
      
      return {
        hash: tx.hash,
        type: 'unstake',
        amount,
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw unstake error:", error);
      throw error;
    }
  }

  /**
   * Unstake via Account Abstraction
   */
  private async unstakeViaAA(
    amount: string,
    amountInWei: ethers.BigNumber
  ): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    console.log('[StakingService] Executing AA unstake:', {
      amount,
      amountInWei: amountInWei.toString(),
      stakingContract: this.getDiamondAddress(),
      accountAddress
    });

    // Get USDC token address for multi-token unstaking
    const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
    if (!usdcAddress) {
      throw new Error('USDC address not found');
    }

    const result = await alchemyService.executeContractFunction(
      this.getDiamondAddress() as Hex,
      LIQUIDITY_POOL_FACET_ABI,
      'unstakeToken',
      [usdcAddress as Hex, BigInt(amountInWei.toString())]
    );

    console.log('[StakingService] AA unstake submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'unstake',
      amount,
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
  }

  /**
   * Claim pending rewards
   * Uses SmartContractTransactionService for unified AA+EOA handling
   */
  public async claimRewards(
    onProgress?: (stage: 'checking' | 'claiming' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Checking pending rewards...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA claimRewards');
          
          // Get private key for linking/fallback
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');

          // Get USDC token address for multi-token rewards
          const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
          if (!usdcAddress) {
            throw new Error('USDC address not found');
          }
          
          // Execute claimTokenRewards transaction with AA
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: LIQUIDITY_POOL_FACET_ABI,
            functionName: 'claimTokenRewards',
            args: [usdcAddress]
          });

          console.log('[StakingService] AA claimRewards completed:', result);

          return {
            hash: result.txHash,
            type: 'claim',
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA claimRewards failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method
      onProgress?.('claiming', 'Claiming rewards...');
      
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

      // Get USDC token address for multi-token rewards
      const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
      if (!usdcAddress) {
        throw new Error('USDC address not found');
      }

      // Try to claim regardless of state
      const gasLimit = ethers.utils.hexlify(200000); // 200k gas limit
      // Multi-token signature: claimTokenRewards(address tokenAddress)
      const tx = await contract.claimTokenRewards(usdcAddress, { gasLimit });
      
      console.log("Claim rewards transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'claim',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw claim rewards error:", error);
      throw error;
    }
  }

  /**
   * Claim rewards via Account Abstraction
   */
  private async claimRewardsViaAA(): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    console.log('[StakingService] Executing AA claimRewards:', {
      stakingContract: this.getDiamondAddress(),
      accountAddress
    });

    // Get USDC token address for multi-token rewards
    const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
    if (!usdcAddress) {
      throw new Error('USDC address not found');
    }

    const result = await alchemyService.executeContractFunction(
      this.getDiamondAddress() as Hex,
      LIQUIDITY_POOL_FACET_ABI,
      'claimTokenRewards',
      [usdcAddress as Hex]
    );

    console.log('[StakingService] AA claimRewards submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'claim',
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
  }

  /**
   * Emergency withdraw (with penalty)
   * Uses SmartContractTransactionService for unified AA+EOA handling
   */
  public async emergencyWithdraw(
    onProgress?: (stage: 'checking' | 'withdrawing' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Checking stake status...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA emergencyWithdraw');
          
          // Get private key for linking/fallback
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');

          // Get USDC token address for multi-token emergency withdrawal
          const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
          if (!usdcAddress) {
            throw new Error('USDC address not found');
          }
          
          // Execute emergencyWithdrawToken transaction with AA
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: LIQUIDITY_POOL_FACET_ABI,
            functionName: 'emergencyWithdrawToken',
            args: [usdcAddress]
          });

          console.log('[StakingService] AA emergencyWithdraw completed:', result);

          return {
            hash: result.txHash,
            type: 'emergency',
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA emergencyWithdraw failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method
      onProgress?.('withdrawing', 'Processing emergency withdrawal...');
      
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

      // Get USDC token address for multi-token emergency withdrawal
      const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
      if (!usdcAddress) {
        throw new Error('USDC address not found');
      }
      
      // Try with manual gas limit to avoid estimation issues
      const gasLimit = ethers.utils.hexlify(250000); // 250k gas limit
      // Multi-token signature: emergencyWithdrawToken(address tokenAddress)
      const tx = await contract.emergencyWithdrawToken(usdcAddress, { gasLimit });
      
      console.log("Emergency withdrawal transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'emergency',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw emergency withdraw error:", error);
      throw error;
    }
  }

  /**
   * Emergency withdraw via Account Abstraction
   */
  private async emergencyWithdrawViaAA(): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    console.log('[StakingService] Executing AA emergencyWithdraw:', {
      stakingContract: this.getDiamondAddress(),
      accountAddress
    });

    // Get USDC token address for multi-token emergency withdrawal
    const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
    if (!usdcAddress) {
      throw new Error('USDC address not found');
    }

    const result = await alchemyService.executeContractFunction(
      this.getDiamondAddress() as Hex,
      LIQUIDITY_POOL_FACET_ABI,
      'emergencyWithdrawToken',
      [usdcAddress as Hex]
    );

    console.log('[StakingService] AA emergencyWithdraw submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'emergency',
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
  }

  /**
   * Apply as financier (required to create proposals)
   * Uses SmartContractTransactionService for unified AA+EOA handling
   */
  public async applyAsFinancier(
    onProgress?: (stage: 'checking' | 'applying' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Checking financier eligibility...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA applyAsFinancier');
          
          // Get private key for linking/fallback
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');
          
          // Execute applyAsFinancier transaction with AA
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: LIQUIDITY_POOL_FACET_ABI,
            functionName: 'applyAsFinancier',
            args: []
          });

          console.log('[StakingService] AA applyAsFinancier completed:', result);

          return {
            hash: result.txHash,
            type: 'proposal', // Using proposal type for financier actions
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA applyAsFinancier failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method
      onProgress?.('applying', 'Submitting financier application...');
      
      const contract = await this.getStakingContract();
      const signer = await this.getSigner();
      const address = await signer.getAddress();
      
      console.log("Applying as financier...");
      
      // Check current stake first
      const stakeData = await contract.getStake(address);
      console.log('Current stake before applying as financier:', {
        amount: stakeData.amount.toString(),
        active: stakeData.active,
        isFinancier: stakeData.isFinancier
      });
      
      if (stakeData.isFinancier) {
        throw new Error("You are already a financier");
      }
      
      // Check if eligible
      const isEligible = await contract.isFinancier(address);
      console.log('🔍 Contract isFinancier check:', isEligible);
      
      if (!isEligible) {
        const stakingConfig = await this.getStakingConfig();
        const currentStake = ethers.utils.formatUnits(stakeData.amount, 6);
        console.log('❌ Not eligible. Current stake:', currentStake, 'USDC');
        console.log('❌ Minimum required:', stakingConfig.minimumFinancierStake, 'USDC');
        console.log('❌ Lock duration remaining:', stakeData.lockDuration?.toString());
        
        throw new Error(`You need at least ${stakingConfig.minimumFinancierStake} USDC staked to become a financier.\n\nCurrent stake: ${currentStake} USDC\n\nNote: The contract may also check lock duration or other requirements.`);
      }
      
      // Try with manual gas limit to avoid estimation issues
      const gasLimit = ethers.utils.hexlify(200000); // 200k gas limit
      const tx = await contract.applyAsFinancier({ gasLimit });
      
      console.log("Apply as financier transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'proposal', // Using proposal type for financier actions
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw apply as financier error:", error);
      throw error;
    }
  }

  /**
   * Apply as financier via Account Abstraction
   */
  private async applyAsFinancierViaAA(): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    console.log('[StakingService] Executing AA applyAsFinancier:', {
      stakingContract: this.getDiamondAddress(),
      accountAddress
    });

    const result = await alchemyService.executeContractFunction(
      this.getDiamondAddress() as Hex,
      LIQUIDITY_POOL_FACET_ABI,
      'applyAsFinancier',
      []
    );

    console.log('[StakingService] AA applyAsFinancier submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'proposal',
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
  }

  /**
   * Check if user is a financier (multi-token aware)
   * Uses smart account address to ensure consistent identity
   */
  public async isFinancier(userAddress?: string): Promise<boolean> {
    try {
      const contract = await this.getStakingContract();
      let address = userAddress;
      
      if (!address) {
        // CRITICAL: Use smart account address for queries
        address = await this.getSmartAccountAddress();
      }

      const isFinancierStatus = await contract.isFinancier(address);
      console.log('🔍 ========== FINANCIER STATUS CHECK (MULTI-TOKEN) ==========');
      console.log('🔍 Address:', address);
      console.log('🔍 Contract returned:', isFinancierStatus);
      console.log('🔍 Type:', typeof isFinancierStatus);
      console.log('🔍 Final boolean result:', Boolean(isFinancierStatus));
      console.log('🔍 ==================================================');
      
      return isFinancierStatus;
    } catch (error) {
      console.error("❌ Error checking financier status:", error);
      console.log('🔍 Returning FALSE due to error');
      return false;
    }
  }

  /**
   * Stake USDC tokens as financier (includes approval if needed and automatically grants financier status)
   * Returns transaction with progress stages
   * 
   * AA Enhancement: Uses SmartContractTransactionService for unified AA+EOA handling
   * - Automatically links smart account to EOA on first transaction
   * - Batch approve+stakeAsFinancier in single UserOp when using AA
   * - Falls back to EOA when AA unavailable or gas limits reached
   */
  public async stakeAsFinancier(
    amount: string, 
    onProgress?: (stage: 'checking' | 'approving' | 'staking' | 'batching' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      // Validate amount
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Invalid stake amount");
      }

      onProgress?.('checking', 'Checking financier staking requirements...');

      // Check minimum financier stake requirement
      const config = await this.getStakingConfig();
      if (amountFloat < parseFloat(config.minimumFinancierStake)) {
        throw new Error(`Minimum financier stake amount is ${config.minimumFinancierStake} USDC`);
      }

      // Check USDC balance
      const balance = await this.getUSDCBalance();
      if (parseFloat(balance) < amountFloat) {
        throw new Error("Insufficient USDC balance");
      }

      const amountInWei = ethers.utils.parseUnits(amount, 6);

      // Get USDC contract address
      const usdcAddress = this.getDefaultTokenAddress();

      // Try AA batch transaction if available
      if (this.shouldUseAA()) {
        try {
          onProgress?.('batching', 'Preparing gasless batch transaction...');
          
          // Get private key for linking/fallback
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');
          
          // Execute batch transaction (approve + stakeAsFinancier) with AA
          const result = await smartContractTransactionService.executeBatchTransaction({
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            transactions: [
              {
                contractAddress: usdcAddress,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [this.getDiamondAddress(), amountInWei.toString()],
                value: '0'
              },
              {
                contractAddress: this.getDiamondAddress(),
                abi: LIQUIDITY_POOL_FACET_ABI,
                functionName: 'stakeTokenAsFinancier',
                // stakeTokenAsFinancier(address tokenAddress, uint256 amount, uint256 customDeadline, uint256 usdEquivalent)
                args: [usdcAddress, amountInWei.toString(), '0', amountInWei.toString()],
                value: '0'
              }
            ]
          });

          console.log('[StakingService] AA batch stakeAsFinancier completed:', result);

          return {
            hash: result.txHash,
            type: 'stake',
            amount,
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA batch stakeAsFinancier failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method: Check and handle approval if needed
      const hasAllowance = await this.checkAllowance(amount);
      if (!hasAllowance) {
        onProgress?.('approving', 'Approving USDC spend...');
        
        const usdcContract = await this.getUSDCContract();
        console.log("Approving USDC spend for financier stake:", {
          amount,
          amountInWei: amountInWei.toString(),
          spender: this.getDiamondAddress(),
        });

        const approveTx = await usdcContract.approve(this.getDiamondAddress(), amountInWei);
        console.log("Approval transaction:", approveTx.hash);
        
        onProgress?.('approving', `Waiting for approval confirmation...`);
        await approveTx.wait();
        console.log("Approval confirmed");
      }

      onProgress?.('staking', 'Staking USDC as financier...');

      const contract = await this.getStakingContract();
      
      console.log("Staking USDC as financier:", {
        amount,
        amountInWei: amountInWei.toString(),
        usdcAddress, // already declared at function scope
        contractAddress: this.getDiamondAddress(),
        customDeadline: 0 // 0 means auto-calculate based on lock duration
      });

      // Add manual gas limit to avoid estimation errors
      const gasLimit = ethers.utils.hexlify(400000); // 400k gas limit
      // Multi-token signature: stakeTokenAsFinancier(address tokenAddress, uint256 amount, uint256 customDeadline, uint256 usdEquivalent)
      // For USDC with 6 decimals, 1 USDC = 1 USD, so usdEquivalent = amount
      const tx = await contract.stakeTokenAsFinancier(usdcAddress, amountInWei, 0, amountInWei, { gasLimit });
      
      console.log("Stake as financier transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'stake',
        amount,
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw stakeAsFinancier error:", error);
      throw error;
    }
  }

  /**
   * Stake as financier via Account Abstraction with batch transaction
   * Combines approve + stakeAsFinancier in single UserOp for gasless operation
   */
  private async stakeAsFinancierViaAA(
    amount: string,
    amountInWei: ethers.BigNumber,
    onProgress?: (stage: 'checking' | 'approving' | 'staking' | 'batching', message: string) => void
  ): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    onProgress?.('batching', 'Submitting gasless batch transaction...');

    // Get USDC contract address
    const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
    if (!usdcAddress) {
      throw new Error('USDC address not found');
    }

    console.log('[StakingService] Executing AA batch stakeAsFinancier:', {
      amount,
      amountInWei: amountInWei.toString(),
      usdcAddress,
      stakingContract: this.getDiamondAddress(),
      accountAddress
    });

    // Execute batch transaction via AA
    const result = await alchemyService.sendBatchUserOperation([
      {
        target: usdcAddress as Hex,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [this.getDiamondAddress() as Hex, BigInt(amountInWei.toString())]
        }),
        value: BigInt(0)
      },
      {
        target: this.getDiamondAddress() as Hex,
        data: encodeFunctionData({
          abi: LIQUIDITY_POOL_FACET_ABI,
          functionName: 'stakeTokenAsFinancier',
          // stakeTokenAsFinancier(address tokenAddress, uint256 amount, uint256 customDeadline, uint256 usdEquivalent)
          args: [usdcAddress as Hex, BigInt(amountInWei.toString()), BigInt(0), BigInt(amountInWei.toString())]
        }),
        value: BigInt(0)
      }
    ]);

    console.log('[StakingService] AA batch stakeAsFinancier submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'stake',
      amount,
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
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
   * Uses staking config data to calculate APR
   */
  public async calculateCurrentAPR(): Promise<number> {
    try {
      const config = await this.getStakingConfig();
      
      // The current reward rate from config IS the current APR
      // It's already adjusted by the contract based on total staked
      const currentAPR = parseFloat(config.currentRewardRate);
      
      return Math.max(currentAPR, 1); // Minimum 1% APR
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
          gasLimit = await usdcContract.estimateGas.approve(this.getDiamondAddress(), amountInWei);
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

  /**
   * GOVERNANCE METHODS
   */

  /**
   * Create a new proposal
   * Uses SmartContractTransactionService for unified AA+EOA handling
   */
  public async createProposal(
    proposalId: string,
    category: string,
    title: string,
    description: string,
    onProgress?: (stage: 'checking' | 'creating' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Checking financier status...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA createProposal');
          
          // Get private key for linking/fallback
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');
          
          // Execute createProposal transaction with AA
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: GOVERNANCE_FACET_ABI,
            functionName: 'createProposal',
            args: [proposalId, category, title, description]
          });

          console.log('[StakingService] AA createProposal completed:', result);

          return {
            hash: result.txHash,
            type: 'proposal',
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA createProposal failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method
      onProgress?.('creating', 'Creating proposal...');
      
      const contract = await this.getGovernanceContract();
      const signer = await this.getSigner();
      const address = await signer.getAddress();
      
      console.log("Creating proposal:", { proposalId, category, title, description });

      // Check stake before attempting to create proposal
      const stakeInfo = await this.getStakeInfo(address);
      console.log("Current stake before creating proposal:", {
        amount: stakeInfo.amount,
        active: stakeInfo.active,
        isFinancier: stakeInfo.isFinancier
      });

      // Check if user is a financier (REQUIRED to create proposals)
      if (!stakeInfo.isFinancier) {
        throw new Error("You must be a financier to create proposals. Please apply as financier first by calling applyAsFinancier().");
      }

      // Get DAO config to check minimum stake requirement
      try {
        const daoConfig = await this.getDAOConfig();
        console.log("DAO Config:", {
          minimumFinancierStake: daoConfig.minimumFinancierStake,
          votingDuration: daoConfig.votingDuration,
          approvalThreshold: daoConfig.approvalThreshold
        });
        
        const stakeAmount = parseFloat(stakeInfo.amount);
        const minRequired = parseFloat(daoConfig.minimumFinancierStake);
        
        if (stakeAmount < minRequired) {
          throw new Error(`You need at least ${minRequired} USDC staked to create proposals. Current stake: ${stakeAmount} USDC`);
        }
      } catch (configError) {
        console.warn("Could not fetch DAO config:", configError);
      }

      // Add manual gas limit to avoid estimation errors
      const gasLimit = ethers.utils.hexlify(300000); // 300k gas limit
      const tx = await contract.createProposal(proposalId, category, title, description);
      
      return {
        hash: tx.hash,
        type: 'proposal',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw create proposal error:", error);
      
      // Try to decode the error
      if (error.data || error.error?.data) {
        const errorData = error.data || error.error?.data;
        console.log("Error data hex:", errorData);
        
        // Known error selectors from GovernanceFacet
        const errorMap: { [key: string]: string } = {
          '0xfa05b05d': 'InsufficientStake - You need more USDC staked to create proposals',
          '0xab35696f': 'AlreadyVoted - You have already voted on this proposal',
          '0x89aad5c8': 'InvalidCategory - Invalid proposal category',
          '0x2f1cf87c': 'InvalidDescription - Proposal description is invalid',
          '0xb8c953b7': 'InvalidProposalId - Proposal ID is invalid or already exists',
          '0x643feb6c': 'InvalidTitle - Proposal title is invalid',
          '0xd93c0665': 'ContractPaused - Contract is currently paused'
        };
        
        const errorSelector = errorData?.toString().slice(0, 10);
        if (errorSelector && errorMap[errorSelector]) {
          throw new Error(errorMap[errorSelector]);
        }
      }
      
      throw error;
    }
  }

  /**
   * Create proposal via Account Abstraction
   */
  private async createProposalViaAA(
    proposalId: string,
    category: string,
    title: string,
    description: string
  ): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    console.log('[StakingService] Executing AA createProposal:', {
      proposalId,
      category,
      title,
      governanceContract: this.getDiamondAddress(),
      accountAddress
    });

    const result = await alchemyService.executeContractFunction(
      this.getDiamondAddress() as Hex,
      GOVERNANCE_FACET_ABI,
      'createProposal',
      [proposalId, category, title, description]
    );

    console.log('[StakingService] AA createProposal submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'proposal',
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
  }

  /**
   * Vote on a proposal
   * Uses SmartContractTransactionService for unified AA+EOA handling
   */
  public async voteOnProposal(
    proposalId: string,
    support: boolean,
    onProgress?: (stage: 'checking' | 'voting' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Preparing to vote...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA voteOnProposal');
          
          // Get private key for linking/fallback
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');
          
          // Execute voteOnProposal transaction with AA
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: GOVERNANCE_FACET_ABI,
            functionName: 'voteOnProposal',
            args: [proposalId, support]
          });

          console.log('[StakingService] AA voteOnProposal completed:', result);

          return {
            hash: result.txHash,
            type: 'vote',
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA voteOnProposal failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method
      onProgress?.('voting', 'Submitting vote...');
      
      const contract = await this.getGovernanceContract();
      
      console.log("Voting on proposal:", { proposalId, support });

      // Add manual gas limit to avoid estimation errors
      const gasLimit = ethers.utils.hexlify(250000); // 250k gas limit
      const tx = await contract.voteOnProposal(proposalId, support, { gasLimit });
      
      return {
        hash: tx.hash,
        type: 'vote',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw vote error:", error);
      throw error;
    }
  }

  /**
   * Vote on proposal via Account Abstraction
   */
  private async voteOnProposalViaAA(
    proposalId: string,
    support: boolean
  ): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    console.log('[StakingService] Executing AA voteOnProposal:', {
      proposalId,
      support,
      governanceContract: this.getDiamondAddress(),
      accountAddress
    });

    const result = await alchemyService.executeContractFunction(
      this.getDiamondAddress() as Hex,
      GOVERNANCE_FACET_ABI,
      'voteOnProposal',
      [proposalId, support]
    );

    console.log('[StakingService] AA voteOnProposal submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'vote',
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
  }

  /**
   * Get all proposals
   */
  public async getAllProposals(): Promise<Proposal[]> {
    try {
      const contract = await this.getGovernanceContract();
      const proposalIds = await contract.getAllProposals();
      
      const proposals: Proposal[] = [];
      for (const id of proposalIds) {
        const proposalData = await contract.getProposal(id);
        const statusMap = ['Active', 'Passed', 'Rejected', 'Executed'];
        
        proposals.push({
          id,
          proposer: proposalData.proposer,
          category: proposalData.category,
          title: proposalData.title,
          description: proposalData.description,
          votesFor: ethers.utils.formatUnits(proposalData.votesFor, 6),
          votesAgainst: ethers.utils.formatUnits(proposalData.votesAgainst, 6),
          createdAt: proposalData.createdAt.toNumber(),
          votingDeadline: proposalData.votingDeadline.toNumber(),
          status: statusMap[proposalData.status] as any,
          executed: proposalData.executed,
        });
      }
      
      return proposals;
    } catch (error) {
      console.error("Error getting proposals:", error);
      return [];
    }
  }

  /**
   * Get active proposals
   */
  public async getActiveProposals(): Promise<Proposal[]> {
    try {
      const contract = await this.getGovernanceContract();
      const proposalIds = await contract.getActiveProposals();
      
      const proposals: Proposal[] = [];
      for (const id of proposalIds) {
        const proposalData = await contract.getProposal(id);
        const statusMap = ['Active', 'Passed', 'Rejected', 'Executed'];
        
        proposals.push({
          id,
          proposer: proposalData.proposer,
          category: proposalData.category,
          title: proposalData.title,
          description: proposalData.description,
          votesFor: ethers.utils.formatUnits(proposalData.votesFor, 6),
          votesAgainst: ethers.utils.formatUnits(proposalData.votesAgainst, 6),
          createdAt: proposalData.createdAt.toNumber(),
          votingDeadline: proposalData.votingDeadline.toNumber(),
          status: statusMap[proposalData.status] as any,
          executed: proposalData.executed,
        });
      }
      
      return proposals;
    } catch (error) {
      console.error("Error getting active proposals:", error);
      return [];
    }
  }

  /**
   * Get a specific proposal
   */
  public async getProposal(proposalId: string): Promise<Proposal | null> {
    try {
      const contract = await this.getGovernanceContract();
      const proposalData = await contract.getProposal(proposalId);
      const statusMap = ['Active', 'Passed', 'Rejected', 'Executed'];
      
      return {
        id: proposalId,
        proposer: proposalData.proposer,
        category: proposalData.category,
        title: proposalData.title,
        description: proposalData.description,
        votesFor: ethers.utils.formatUnits(proposalData.votesFor, 6),
        votesAgainst: ethers.utils.formatUnits(proposalData.votesAgainst, 6),
        createdAt: proposalData.createdAt.toNumber(),
        votingDeadline: proposalData.votingDeadline.toNumber(),
        status: statusMap[proposalData.status] as any,
        executed: proposalData.executed,
      };
    } catch (error) {
      console.error("Error getting proposal:", error);
      return null;
    }
  }

  /**
   * Get vote status for a user on a proposal
   * Uses smart account address to ensure consistent identity
   */
  public async getVoteStatus(proposalId: string, voterAddress?: string): Promise<VoteStatus> {
    try {
      const contract = await this.getGovernanceContract();
      let address = voterAddress;
      
      if (!address) {
        // CRITICAL: Use smart account address for queries
        address = await this.getSmartAccountAddress();
      }

      const voteStatus = await contract.getVoteStatus(proposalId, address);
      
      return {
        hasVoted: voteStatus.hasVoted,
        support: voteStatus.support,
      };
    } catch (error) {
      console.error("Error getting vote status:", error);
      return { hasVoted: false, support: false };
    }
  }

  /**
   * Get DAO configuration
   */
  public async getDAOConfig(): Promise<DAOConfig> {
    try {
      const contract = await this.getGovernanceContract();
      const config = await contract.getDAOConfig();
      
      return {
        minimumFinancierStake: ethers.utils.formatUnits(config.minimumFinancierStake, 6),
        votingDuration: config.votingDuration.toNumber(),
        approvalThreshold: config.approvalThreshold.toNumber(),
        revocationPeriod: config.revocationPeriod.toNumber(),
      };
    } catch (error) {
      console.error("Error getting DAO config:", error);
      throw new Error("Failed to fetch DAO configuration");
    }
  }

  /**
   * Get DAO statistics
   */
  public async getDAOStats(): Promise<DAOStats> {
    try {
      const contract = await this.getGovernanceContract();
      const stats = await contract.getDAOStats();
      
      return {
        totalProposals: stats.totalProposals.toNumber(),
        activeProposals: stats.activeProposals.toNumber(),
        passedProposals: stats.passedProposals.toNumber(),
        executedProposals: stats.executedProposals.toNumber(),
      };
    } catch (error) {
      console.error("Error getting DAO stats:", error);
      return {
        totalProposals: 0,
        activeProposals: 0,
        passedProposals: 0,
        executedProposals: 0,
      };
    }
  }

  /**
   * Finalize voting on a proposal
   */
  public async finalizeVote(proposalId: string): Promise<StakingTransaction> {
    try {
      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA finalizeVote');
          return await this.finalizeVoteViaAA(proposalId);
        } catch (error) {
          console.warn('[StakingService] AA finalizeVote failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method
      const contract = await this.getGovernanceContract();
      
      console.log("Finalizing vote for proposal:", proposalId);

      const tx = await contract.finalizeVote(proposalId);
      
      return {
        hash: tx.hash,
        type: 'proposal',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
      };
    } catch (error: any) {
      console.error("Raw finalize vote error:", error);
      throw error;
    }
  }

  /**
   * Finalize vote via Account Abstraction
   */
  private async finalizeVoteViaAA(proposalId: string): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    console.log('[StakingService] Executing AA finalizeVote:', {
      proposalId,
      governanceContract: this.getDiamondAddress(),
      accountAddress
    });

    const result = await alchemyService.executeContractFunction(
      this.getDiamondAddress() as Hex,
      GOVERNANCE_FACET_ABI,
      'finalizeVote',
      [proposalId]
    );

    console.log('[StakingService] AA finalizeVote submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'proposal',
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
  }

  /**
   * Execute a passed proposal
   * Uses SmartContractTransactionService for unified AA+EOA handling
   */
  public async executeProposal(
    proposalId: string,
    onProgress?: (stage: 'checking' | 'executing' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Preparing to execute proposal...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA executeProposal');
          
          // Get private key for linking/fallback
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');
          
          // Execute executeProposal transaction with AA
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: GOVERNANCE_FACET_ABI,
            functionName: 'executeProposal',
            args: [proposalId]
          });

          console.log('[StakingService] AA executeProposal completed:', result);

          return {
            hash: result.txHash,
            type: 'proposal',
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA executeProposal failed, falling back to EOA:', error);
          // Continue to EOA method below
        }
      }

      // EOA method
      onProgress?.('executing', 'Executing proposal...');
      
      const contract = await this.getGovernanceContract();
      
      console.log("Executing proposal:", proposalId);

      const tx = await contract.executeProposal(proposalId);
      
      return {
        hash: tx.hash,
        type: 'proposal',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw execute proposal error:", error);
      throw error;
    }
  }

  /**
   * Execute proposal via Account Abstraction
   */
  private async executeProposalViaAA(proposalId: string): Promise<StakingTransaction> {
    const alchemyService = await this.initializeAA();
    if (!alchemyService) {
      throw new Error('Failed to initialize AA service');
    }

    const accountAddress = alchemyService.getAccountAddress();
    if (!accountAddress) {
      throw new Error('Failed to get smart account address');
    }

    console.log('[StakingService] Executing AA executeProposal:', {
      proposalId,
      governanceContract: this.getDiamondAddress(),
      accountAddress
    });

    const result = await alchemyService.executeContractFunction(
      this.getDiamondAddress() as Hex,
      GOVERNANCE_FACET_ABI,
      'executeProposal',
      [proposalId]
    );

    console.log('[StakingService] AA executeProposal submitted:', result.hash);

    return {
      hash: result.hash,
      type: 'proposal',
      timestamp: Date.now(),
      status: 'pending',
      explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${result.hash}`,
    };
  }

  // ========================================
  // MULTI-TOKEN VIEW FUNCTIONS
  // ========================================

  /**
   * Get stake information for a specific token
   * @param staker Address of the staker
   * @param tokenAddress Address of the staking token
   */
  public async getStakeForToken(
    tokenAddress: string,
    staker?: string
  ): Promise<TokenStakeInfo> {
    try {
      const contract = await this.getStakingContract();
      let address = staker;
      
      if (!address) {
        address = await this.getSmartAccountAddress();
      }

      console.log('Getting stake for token:', { tokenAddress, staker: address });
      
      const stakeData = await contract.getStakeForToken(address, tokenAddress);
      
      // Get token decimals for proper formatting
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, await this.getSigner());
      const decimals = await tokenContract.decimals();
      
      return {
        tokenAddress,
        amount: ethers.utils.formatUnits(stakeData.amount, decimals),
        timestamp: stakeData.timestamp.toNumber(),
        active: stakeData.active,
        usdEquivalent: ethers.utils.formatUnits(stakeData.usdEquivalent, 18), // USD is 18 decimals
        deadline: stakeData.deadline.toNumber(),
        isFinancier: stakeData.financierStatus,
        pendingRewards: ethers.utils.formatUnits(stakeData.pendingRewards, decimals),
        votingPower: ethers.utils.formatUnits(stakeData.votingPower, 18),
      };
    } catch (error) {
      console.error("Error getting stake for token:", error);
      return {
        tokenAddress,
        amount: "0",
        timestamp: 0,
        active: false,
        usdEquivalent: "0",
        deadline: 0,
        isFinancier: false,
        pendingRewards: "0",
        votingPower: "0",
      };
    }
  }

  /**
   * Get all stakes for a user across all supported tokens
   * @param staker Address of the staker (optional, uses current user if not provided)
   */
  public async getAllStakesForUser(staker?: string): Promise<AllStakesInfo> {
    try {
      const contract = await this.getStakingContract();
      let address = staker;
      
      if (!address) {
        address = await this.getSmartAccountAddress();
      }

      console.log('Getting all stakes for user:', address);
      
      const allStakes = await contract.getAllStakesForUser(address);
      
      // Format the response
      const tokens = allStakes.tokens;
      const amounts: string[] = [];
      const usdEquivalents: string[] = [];
      const isFinancierFlags = allStakes.isFinancierFlags;
      const deadlines: number[] = [];
      const pendingRewards: string[] = [];
      
      // Get decimals for each token and format amounts
      for (let i = 0; i < tokens.length; i++) {
        const tokenContract = new ethers.Contract(tokens[i], ERC20_ABI, await this.getSigner());
        const decimals = await tokenContract.decimals();
        
        amounts.push(ethers.utils.formatUnits(allStakes.amounts[i], decimals));
        usdEquivalents.push(ethers.utils.formatUnits(allStakes.usdEquivalents[i], 18));
        deadlines.push(allStakes.deadlines[i].toNumber());
        pendingRewards.push(ethers.utils.formatUnits(allStakes.pendingRewards[i], decimals));
      }
      
      return {
        tokens,
        amounts,
        usdEquivalents,
        isFinancierFlags,
        deadlines,
        pendingRewards,
        totalUsdValue: ethers.utils.formatUnits(allStakes.totalUsdValue, 18),
      };
    } catch (error) {
      console.error("Error getting all stakes for user:", error);
      return {
        tokens: [],
        amounts: [],
        usdEquivalents: [],
        isFinancierFlags: [],
        deadlines: [],
        pendingRewards: [],
        totalUsdValue: "0",
      };
    }
  }

  // ========================================
  // FINANCIER REVOCATION FUNCTIONS
  // ========================================

  /**
   * Request financier revocation (starts 30-day waiting period)
   * @param onProgress Optional callback for progress updates
   */
  public async requestFinancierRevocation(
    onProgress?: (stage: 'checking' | 'requesting' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Checking financier status...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA requestFinancierRevocation');
          
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');
          
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: GOVERNANCE_FACET_ABI,
            functionName: 'requestFinancierRevocation',
            args: []
          });

          console.log('[StakingService] AA requestFinancierRevocation completed:', result);

          return {
            hash: result.txHash,
            type: 'revocation',
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA requestFinancierRevocation failed, falling back to EOA:', error);
        }
      }

      // EOA method
      onProgress?.('requesting', 'Submitting revocation request...');
      
      const contract = await this.getGovernanceContract();
      
      console.log("Requesting financier revocation...");
      
      const gasLimit = ethers.utils.hexlify(200000);
      const tx = await contract.requestFinancierRevocation({ gasLimit });
      
      console.log("Revocation request transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'revocation',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw requestFinancierRevocation error:", error);
      throw error;
    }
  }

  /**
   * Cancel a pending financier revocation request
   * @param onProgress Optional callback for progress updates
   */
  public async cancelFinancierRevocation(
    onProgress?: (stage: 'checking' | 'cancelling' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Checking revocation status...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA cancelFinancierRevocation');
          
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');
          
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: GOVERNANCE_FACET_ABI,
            functionName: 'cancelFinancierRevocation',
            args: []
          });

          console.log('[StakingService] AA cancelFinancierRevocation completed:', result);

          return {
            hash: result.txHash,
            type: 'revocation',
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA cancelFinancierRevocation failed, falling back to EOA:', error);
        }
      }

      // EOA method
      onProgress?.('cancelling', 'Cancelling revocation request...');
      
      const contract = await this.getGovernanceContract();
      
      console.log("Cancelling financier revocation...");
      
      const gasLimit = ethers.utils.hexlify(200000);
      const tx = await contract.cancelFinancierRevocation({ gasLimit });
      
      console.log("Revocation cancellation transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'revocation',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw cancelFinancierRevocation error:", error);
      throw error;
    }
  }

  /**
   * Complete financier revocation after 30-day waiting period
   * @param onProgress Optional callback for progress updates
   */
  public async completeFinancierRevocation(
    onProgress?: (stage: 'checking' | 'completing' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Verifying revocation period...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA completeFinancierRevocation');
          
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');
          
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: GOVERNANCE_FACET_ABI,
            functionName: 'completeFinancierRevocation',
            args: []
          });

          console.log('[StakingService] AA completeFinancierRevocation completed:', result);

          return {
            hash: result.txHash,
            type: 'revocation',
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA completeFinancierRevocation failed, falling back to EOA:', error);
        }
      }

      // EOA method
      onProgress?.('completing', 'Completing revocation...');
      
      const contract = await this.getGovernanceContract();
      
      console.log("Completing financier revocation...");
      
      const gasLimit = ethers.utils.hexlify(200000);
      const tx = await contract.completeFinancierRevocation({ gasLimit });
      
      console.log("Revocation completion transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'revocation',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw completeFinancierRevocation error:", error);
      throw error;
    }
  }

  /**
   * Get revocation status for a financier
   * @param staker Address of the staker (optional, uses current user if not provided)
   */
  public async getRevocationStatus(staker?: string): Promise<RevocationStatus> {
    try {
      const contract = await this.getGovernanceContract();
      let address = staker;
      
      if (!address) {
        address = await this.getSmartAccountAddress();
      }

      console.log('Getting revocation status for:', address);
      
      const status = await contract.getRevocationStatus(address);
      
      return {
        revocationRequested: status.revocationRequested,
        revocationRequestTime: status.revocationRequestTime.toNumber(),
        revocationDeadline: status.revocationDeadline.toNumber(),
        canCompleteRevocation: status.canCompleteRevocation,
      };
    } catch (error) {
      console.error("Error getting revocation status:", error);
      return {
        revocationRequested: false,
        revocationRequestTime: 0,
        revocationDeadline: 0,
        canCompleteRevocation: false,
      };
    }
  }

  // ========================================
  // CUSTOM DEADLINE FUNCTION
  // ========================================

  /**
   * Set a custom deadline for staking lock period
   * @param newDeadline Unix timestamp for the new deadline
   * @param onProgress Optional callback for progress updates
   */
  public async setCustomDeadline(
    newDeadline: number,
    onProgress?: (stage: 'checking' | 'setting' | 'linking', message: string) => void
  ): Promise<StakingTransaction> {
    try {
      onProgress?.('checking', 'Validating deadline...');

      // Try AA if available
      if (this.shouldUseAA()) {
        try {
          console.log('[StakingService] Attempting AA setCustomDeadline');
          
          const password = await secureStorage.getSecureItem('blockfinax.password');
          if (!password) {
            throw new Error('Password not found for AA transaction');
          }
          const privateKey = await secureStorage.getDecryptedPrivateKey(password);
          if (!privateKey) {
            throw new Error('Private key not found for AA transaction');
          }

          onProgress?.('linking', 'Linking smart account to your identity...');
          
          const result = await smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            network: LISK_SEPOLIA_NETWORK,
            privateKey,
            abi: LIQUIDITY_POOL_FACET_ABI,
            functionName: 'setCustomDeadline',
            args: [newDeadline.toString()]
          });

          console.log('[StakingService] AA setCustomDeadline completed:', result);

          return {
            hash: result.txHash,
            type: 'stake',
            timestamp: Date.now(),
            status: 'pending',
            explorerUrl: result.explorerUrl,
            usedAA: result.usedSmartAccount
          };
        } catch (error) {
          console.warn('[StakingService] AA setCustomDeadline failed, falling back to EOA:', error);
        }
      }

      // EOA method
      onProgress?.('setting', 'Setting custom deadline...');
      
      const contract = await this.getStakingContract();
      
      console.log("Setting custom deadline:", new Date(newDeadline * 1000).toISOString());
      
      const gasLimit = ethers.utils.hexlify(200000);
      const tx = await contract.setCustomDeadline(newDeadline, { gasLimit });
      
      console.log("Custom deadline transaction submitted:", tx.hash);
      
      return {
        hash: tx.hash,
        type: 'stake',
        timestamp: Date.now(),
        status: 'pending',
        explorerUrl: `${LISK_SEPOLIA_NETWORK.explorerUrl}/tx/${tx.hash}`,
        usedAA: false
      };
    } catch (error: any) {
      console.error("Raw setCustomDeadline error:", error);
      throw error;
    }
  }

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  /**
   * Get the default staking token (USDC) address
   */
  public getDefaultTokenAddress(): string {
    const usdcAddress = LISK_SEPOLIA_NETWORK.stablecoins?.[0]?.address;
    if (!usdcAddress) {
      throw new Error('USDC address not found for Lisk Sepolia network');
    }
    return usdcAddress;
  }

  /**
   * Calculate deadline timestamp from days
   * @param days Number of days from now
   */
  public calculateDeadlineFromDays(days: number): number {
    return Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);
  }

  /**
   * Format deadline to human-readable string
   * @param deadline Unix timestamp
   */
  public formatDeadline(deadline: number): string {
    const date = new Date(deadline * 1000);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
      return 'Unlocked';
    } else if (days === 0) {
      return 'Unlocks today';
    } else if (days === 1) {
      return 'Unlocks tomorrow';
    } else {
      return `Unlocks in ${days} days`;
    }
  }
}

export const stakingService = StakingService.getInstance();
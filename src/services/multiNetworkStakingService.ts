/**
 * Multi-Network Staking Service
 * 
 * Supports staking on multiple networks with multiple stablecoins.
 * All stablecoin values are normalized to USD equivalent for consistent UX.
 */

import { WalletNetwork } from "@/contexts/WalletContext";
import { ethers } from "ethers";
import {
  getSupportedStablecoins,
  getStablecoinPriceUSD,
  convertToUSD,
  convertFromUSD,
  StablecoinConfig,
} from "@/config/stablecoinPrices";

/**
 * Network-specific Diamond contract addresses
 * Deployed and verified on multiple networks
 */
export const DIAMOND_ADDRESSES: Record<number, string> = {
  11155111: "0xA4d19a7b133d2A9fAce5b1ad407cA7b9D4Ee9284", // Ethereum Sepolia
  4202: "0xE133CD2eE4d835AC202942Baff2B1D6d47862d34", // Lisk Sepolia (Updated)
  84532: "0xb899A968e785dD721dbc40e71e2FAEd7B2d84711", // Base Sepolia
  // Mainnet deployments (coming soon)
  // 1: "0x...", // Ethereum Mainnet
  // 8453: "0x...", // Base Mainnet
  // 56: "0x...", // BSC Mainnet
};

/**
 * Check if staking is supported on a network
 */
export function isStakingSupportedOnNetwork(chainId: number): boolean {
  return chainId in DIAMOND_ADDRESSES;
}

/**
 * Get Diamond contract address for network
 */
export function getDiamondAddress(chainId: number): string | null {
  return DIAMOND_ADDRESSES[chainId] || null;
}

/**
 * Enhanced stake info with token details
 */
export interface MultiTokenStakeInfo {
  // Per-token stakes
  stakes: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;
    amount: string; // Token amount
    usdValue: number; // USD equivalent
    timestamp: number;
    deadline: number;
    pendingRewards: string;
    active: boolean;
  }>;
  
  // Aggregated totals
  totalStakedUSD: number;
  totalVotingPower: string;
  isFinancier: boolean;
  canUnstake: boolean;
  timeUntilUnlock: number;
}

/**
 * Pool statistics with multi-token support
 */
export interface MultiTokenPoolStats {
  // Per-token stats
  perToken: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    totalStaked: string; // Token amount
    totalStakedUSD: number;
  }>;
  
  // Aggregated stats
  totalStakedUSD: number;
  totalLiquidityProviders: number;
  currentAPR: number;
  averageAPR: number;
}

/**
 * Staking configuration
 */
export interface StakingConfigMultiToken {
  minimumStakeUSD: number; // Minimum in USD
  minimumFinancierStakeUSD: number;
  minLockDuration: number;
  minFinancierLockDuration: number;
  emergencyWithdrawPenalty: number; // Percentage
  supportedTokens: StablecoinConfig[];
}

/**
 * Multi-network staking service
 */
export class MultiNetworkStakingService {
  private providers: Map<number, ethers.providers.Provider> = new Map();
  private contracts: Map<number, ethers.Contract> = new Map();

  /**
   * Get or create provider for network
   */
  private getProvider(network: WalletNetwork): ethers.providers.Provider {
    if (!this.providers.has(network.chainId)) {
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl, {
        name: network.name,
        chainId: network.chainId,
      });
      this.providers.set(network.chainId, provider);
    }
    return this.providers.get(network.chainId)!;
  }

  /**
   * Get staking contract for network
   */
  private async getStakingContract(
    network: WalletNetwork,
    signer?: ethers.Signer
  ): Promise<ethers.Contract> {
    const contractAddress = getDiamondAddress(network.chainId);
    if (!contractAddress) {
      throw new Error(`Staking not supported on ${network.name}`);
    }

    const provider = signer || this.getProvider(network);
    
    // Use simplified ABI for multi-token operations
    const abi = [
      // Multi-token staking
      "function stakeToken(address tokenAddress, uint256 amount, uint256 customDeadline, uint256 usdEquivalent) external",
      "function unstakeToken(address tokenAddress, uint256 amount) external",
      
      // Legacy (backward compatible)
      "function stake(uint256 amount, uint256 customDeadline) external",
      "function unstake(uint256 amount) external",
      
      // Query functions
      "function getStakeForToken(address staker, address tokenAddress) external view returns (uint256 amount, uint256 timestamp, bool active, uint256 usdEquivalent, uint256 deadline, bool financierStatus, uint256 pendingRewards, uint256 votingPower)",
      "function getAllStakesForUser(address staker) external view returns (address[] tokens, uint256[] amounts, uint256[] usdEquivalents, uint256 totalUsdValue)",
      "function getSupportedStakingTokens() external view returns (address[])",
      "function isTokenSupported(address tokenAddress) external view returns (bool)",
      "function getStakingConfig() external view returns (uint256 initialApr, uint256 currentRewardRate, uint256 minLockDuration, uint256 aprReductionPerThousand, uint256 emergencyWithdrawPenalty, uint256 minimumStake, uint256 minimumFinancierStake, uint256 minFinancierLockDuration, uint256 minNormalStakerLockDuration)",
      
      // Token management (admin)
      "function addSupportedStakingToken(address tokenAddress) external",
      "function removeSupportedStakingToken(address tokenAddress) external",
      
      // ERC20 interface for token operations
      "function balanceOf(address account) external view returns (uint256)",
      "function allowance(address owner, address spender) external view returns (uint256)",
      "function approve(address spender, uint256 amount) external returns (bool)",
    ];

    return new ethers.Contract(contractAddress, abi, provider);
  }

  /**
   * Get user's multi-token stake info
   */
  async getMultiTokenStakeInfo(
    userAddress: string,
    network: WalletNetwork
  ): Promise<MultiTokenStakeInfo> {
    const contract = await this.getStakingContract(network);
    const provider = this.getProvider(network);

    try {
      // Get all stakes for user
      const [tokens, amounts, usdEquivalents, totalUsdValue] = 
        await contract.getAllStakesForUser(userAddress);

      const stakes = [];
      let totalVotingPower = ethers.BigNumber.from(0);
      let earliestDeadline = Number.MAX_SAFE_INTEGER;
      let isFinancier = false;

      for (let i = 0; i < tokens.length; i++) {
        if (amounts[i].isZero()) continue; // Skip zero stakes

        // Get detailed info for this token
        const [
          amount,
          timestamp,
          votingPower,
          active,
          pendingRewards,
          timeUntilUnlock,
          deadline,
          isTokenFinancier,
          usdEquivalent,
        ] = await contract.getStakeForToken(userAddress, tokens[i]);

        if (!active) continue;

        // Find token config
        const supportedTokens = getSupportedStablecoins(network.chainId);
        const tokenConfig = supportedTokens.find(
          t => t.address.toLowerCase() === tokens[i].toLowerCase()
        );

        if (!tokenConfig) continue;

        stakes.push({
          tokenAddress: tokens[i],
          tokenSymbol: tokenConfig.symbol,
          tokenDecimals: tokenConfig.decimals,
          amount: ethers.utils.formatUnits(amount, tokenConfig.decimals),
          usdValue: Number(ethers.utils.formatUnits(usdEquivalent, 6)), // USD uses 6 decimals
          timestamp: timestamp.toNumber(),
          deadline: deadline.toNumber(),
          pendingRewards: ethers.utils.formatUnits(pendingRewards, tokenConfig.decimals),
          active,
        });

        totalVotingPower = totalVotingPower.add(votingPower);
        if (deadline.toNumber() < earliestDeadline) {
          earliestDeadline = deadline.toNumber();
        }
        if (isTokenFinancier) {
          isFinancier = true;
        }
      }

      const now = Math.floor(Date.now() / 1000);
      const canUnstake = earliestDeadline <= now;
      const timeUntilUnlock = earliestDeadline > now ? earliestDeadline - now : 0;

      return {
        stakes,
        totalStakedUSD: Number(ethers.utils.formatUnits(totalUsdValue, 6)),
        totalVotingPower: ethers.utils.formatUnits(totalVotingPower, 6),
        isFinancier,
        canUnstake,
        timeUntilUnlock,
      };
    } catch (error) {
      console.error("Failed to get multi-token stake info:", error);
      // Return empty stakes instead of throwing - contract may not support multi-token yet
      return {
        stakes: [],
        totalStakedUSD: 0,
        totalVotingPower: "0",
        isFinancier: false,
        canUnstake: false,
        timeUntilUnlock: 0,
      };
    }
  }

  /**
   * Alias for getMultiTokenStakeInfo - get all user stakes across all supported tokens
   */
  async getAllUserStakes(
    userAddress: string,
    chainId: number
  ): Promise<MultiTokenStakeInfo> {
    const network = this.getNetworkByChainId(chainId);
    return this.getMultiTokenStakeInfo(userAddress, network);
  }

  /**
   * Get multi-token pool statistics
   */
  async getMultiTokenPoolStats(
    network: WalletNetwork
  ): Promise<MultiTokenPoolStats> {
    const contract = await this.getStakingContract(network);
    const provider = this.getProvider(network);

    try {
      // Get supported tokens
      const supportedTokenAddresses = await contract.getSupportedStakingTokens();
      const supportedTokens = getSupportedStablecoins(network.chainId);

      const perToken = [];
      let totalStakedUSD = 0;

      for (const tokenAddress of supportedTokenAddresses) {
        const tokenConfig = supportedTokens.find(
          t => t.address.toLowerCase() === tokenAddress.toLowerCase()
        );

        if (!tokenConfig) continue;

        // Get token contract to query balance
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ["function balanceOf(address) view returns (uint256)"],
          provider
        );

        const balance = await tokenContract.balanceOf(contract.address);
        const balanceFormatted = ethers.utils.formatUnits(balance, tokenConfig.decimals);

        // Convert to USD (simplified - uses 1:1 peg for stablecoins)
        const usdValue = await convertToUSD(
          balanceFormatted,
          tokenConfig.symbol,
          network.chainId
        );

        perToken.push({
          tokenAddress,
          tokenSymbol: tokenConfig.symbol,
          totalStaked: balanceFormatted,
          totalStakedUSD: usdValue,
        });

        totalStakedUSD += usdValue;
      }

      // Get current reward rate from staking config
      const config = await contract.getStakingConfig();
      const currentRewardRate = config.currentRewardRate;

      // currentRewardRate is stored as a plain percentage (e.g., 12 => 12%)
      const currentAPR = Number(currentRewardRate.toString());

      // For total LPs, we can derive from stakers count or set a reasonable estimate
      // Since we don't have getPoolStats, we'll use 0 as placeholder
      const totalLPs = 0; // This can be updated if needed from another source

      return {
        perToken,
        totalStakedUSD,
        totalLiquidityProviders: totalLPs,
        currentAPR: Number.isFinite(currentAPR) ? currentAPR : 0,
        averageAPR: Number.isFinite(currentAPR) ? currentAPR : 0,
      };
    } catch (error) {
      console.error("Failed to get pool stats:", error);
      throw error;
    }
  }

  /**
   * Get staking configuration
   */
  async getStakingConfig(network: WalletNetwork): Promise<StakingConfigMultiToken> {
    const contract = await this.getStakingContract(network);

    try {
      const [
        initialApr,
        currentRewardRate,
        minLockDuration,
        aprReductionPerThousand,
        emergencyWithdrawPenalty,
        minimumStake,
        minimumFinancierStake,
        minFinancierLockDuration,
        minNormalStakerLockDuration,
      ] = await contract.getStakingConfig();

      const supportedTokens = getSupportedStablecoins(network.chainId);

      return {
        minimumStakeUSD: Number(ethers.utils.formatUnits(minimumStake, 6)),
        minimumFinancierStakeUSD: Number(ethers.utils.formatUnits(minimumFinancierStake, 6)),
        minLockDuration: Number(minLockDuration.toString()),
        minFinancierLockDuration: Number(minFinancierLockDuration.toString()),
        emergencyWithdrawPenalty: Number(emergencyWithdrawPenalty.toString()),
        supportedTokens,
      };
    } catch (error) {
      console.error("Failed to get staking config:", error);
      throw error;
    }
  }

  /**
   * Stake stablecoin (auto-converts to USD equivalent)
   */
  async stakeStablecoin(
    signer: ethers.Signer,
    network: WalletNetwork,
    tokenAddress: string,
    amount: string,
    customDeadline: number
  ): Promise<ethers.ContractTransaction> {
    const contract = await this.getStakingContract(network, signer);
    const provider = this.getProvider(network);

    // Find token config
    const supportedTokens = getSupportedStablecoins(network.chainId);
    const tokenConfig = supportedTokens.find(
      t => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (!tokenConfig) {
      throw new Error(`Token ${tokenAddress} not supported on ${network.name}`);
    }

    // Convert amount to wei
    const amountWei = ethers.utils.parseUnits(amount, tokenConfig.decimals);

    // Calculate USD equivalent (simplified - uses 1:1 peg for stablecoins)
    const usdValue = await convertToUSD(
      amount,
      tokenConfig.symbol,
      network.chainId
    );
    const usdValueWei = ethers.utils.parseEther(usdValue.toString());

    // Approve token first
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ["function approve(address spender, uint256 amount) external returns (bool)"],
      signer
    );

    const approveTx = await tokenContract.approve(contract.address, amountWei);
    await approveTx.wait();

    // Stake
    const tx = await contract.stakeToken(
      tokenAddress,
      amountWei,
      customDeadline,
      usdValueWei
    );

    return tx;
  }

  /**
   * Get user's token balance
   */
  async getTokenBalance(
    userAddress: string,
    tokenAddress: string,
    chainId: number
  ): Promise<string> {
    const network = this.getNetworkByChainId(chainId);
    const provider = this.getProvider(network);
    const supportedTokens = getSupportedStablecoins(network.chainId);
    const tokenConfig = supportedTokens.find(
      t => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (!tokenConfig) {
      throw new Error("Token not supported");
    }

    const tokenContract = new ethers.Contract(
      tokenAddress,
      ["function balanceOf(address) view returns (uint256)"],
      provider
    );

    const balance = await tokenContract.balanceOf(userAddress);
    return ethers.utils.formatUnits(balance, tokenConfig.decimals);
  }

  /**
   * Get total staked amount for a specific token across all users
   */
  async getTotalStakedForToken(
    tokenAddress: string,
    chainId: number
  ): Promise<string> {
    try {
      const network = this.getNetworkByChainId(chainId);
      const contract = await this.getStakingContract(network);
      const supportedTokens = getSupportedStablecoins(chainId);
      const tokenConfig = supportedTokens.find(
        t => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );

      if (!tokenConfig) {
        return "0";
      }

      // Since getPoolStats is removed, we'll return the contract balance for this token
      // This is an approximation of total staked for the token
      try {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ["function balanceOf(address) view returns (uint256)"],
          this.getProvider(network)
        );
        const balance = await tokenContract.balanceOf(getDiamondAddress(chainId));
        return ethers.utils.formatUnits(balance, tokenConfig.decimals);
      } catch (error) {
        console.warn(`Failed to get token balance for ${tokenConfig.symbol}:`, error);
        return "0";
      }
    } catch (error) {
      console.error(`Failed to get total staked for token:`, error);
      return "0";
    }
  }

  /**
   * Helper to get network object by chainId
   */
  private getNetworkByChainId(chainId: number): WalletNetwork {
    // Map chainId to network object
    const networkMap: Record<number, WalletNetwork> = {
      4202: {
        id: "lisk-sepolia",
        name: "Lisk Sepolia",
        chainId: 4202,
        rpcUrl: "https://rpc.sepolia-api.lisk.com",
        explorerUrl: "https://sepolia-blockscout.lisk.com",
        primaryCurrency: "ETH",
        isTestnet: true,
      },
      84532: {
        id: "base-sepolia",
        name: "Base Sepolia",
        chainId: 84532,
        rpcUrl: "https://sepolia.base.org",
        explorerUrl: "https://sepolia.basescan.org",
        primaryCurrency: "ETH",
        isTestnet: true,
      },
      // Add more networks as needed
    };

    const network = networkMap[chainId];
    if (!network) {
      throw new Error(`Network ${chainId} not configured`);
    }
    return network;
  }
}

// Export singleton
export const multiNetworkStakingService = new MultiNetworkStakingService();

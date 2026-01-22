/**
 * Multi-Token Multi-Network Staking Service
 * 
 * Integrated with upgraded Diamond contracts supporting:
 * - Multiple stablecoins (USDC, USDT)
 * - Multiple networks (Lisk Sepolia, Base Sepolia)
 * - Multi-token staking via LiquidityPoolFacet
 * - Token management via GovernanceFacet
 */

import { ethers } from "ethers";
import { WalletNetwork } from "@/contexts/WalletContext";
import {
  getSupportedStablecoins,
  convertToUSD,
  StablecoinConfig,
} from "@/config/stablecoinPrices";
import { secureStorage } from "@/utils/secureStorage";
import { LIQUIDITY_POOL_FACET_ABI } from "@/contracts/LiquidityPoolFacet.abi";
import { GOVERNANCE_FACET_ABI } from "@/contracts/GovernanceFacet.abi";

/**
 * Network-specific Diamond contract addresses
 */
export const DIAMOND_ADDRESSES: Record<number, string> = {
  11155111: "0xA4d19a7b133d2A9fAce5b1ad407cA7b9D4Ee9284", // Ethereum Sepolia
  4202: "0xE133CD2eE4d835AC202942Baff2B1D6d47862d34", // Lisk Sepolia
  84532: "0xb899A968e785dD721dbc40e71e2FAEd7B2d84711", // Base Sepolia
};

/**
 * ERC20 Token ABI
 */
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

/**
 * Enhanced stake info for a single token
 */
export interface TokenStakeInfo {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  amount: string; // Formatted amount
  amountRaw: ethers.BigNumber; // Raw wei amount
  usdValue: number;
  timestamp: number;
  deadline: number;
  pendingRewards: string;
  pendingRewardsRaw: ethers.BigNumber;
  votingPower: string;
  active: boolean;
  isFinancier: boolean;
}

/**
 * Multi-token user stake info
 */
export interface MultiTokenUserStakes {
  stakes: TokenStakeInfo[];
  totalStakedUSD: number;
  totalVotingPower: string;
  isFinancier: boolean;
  canUnstake: boolean;
  timeUntilUnlock: number;
  earliestDeadline: number;
}

/**
 * Pool statistics for a token
 */
export interface TokenPoolStats {
  tokenAddress: string;
  tokenSymbol: string;
  totalStaked: string;
  totalStakedUSD: number;
}

/**
 * Multi-token pool statistics
 */
export interface MultiTokenPoolStats {
  perToken: TokenPoolStats[];
  totalStakedUSD: number;
  totalStakers: number;
  currentAPR: number;
}

/**
 * Staking transaction with progress tracking
 */
export interface StakingTransaction {
  hash: string;
  type: "approve" | "stake" | "unstake" | "claim";
  tokenAddress?: string;
  tokenSymbol?: string;
  amount?: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
  explorerUrl?: string;
}

/**
 * Multi-Token Multi-Network Staking Service Class
 */
class MultiTokenStakingService {
  private providers: Map<number, ethers.providers.JsonRpcProvider> = new Map();
  private stakingContracts: Map<number, ethers.Contract> = new Map();
  private governanceContracts: Map<number, ethers.Contract> = new Map();

  /**
   * Get provider for network
   */
  private getProvider(chainId: number): ethers.providers.JsonRpcProvider {
    if (!this.providers.has(chainId)) {
      const rpcUrls: Record<number, string> = {
        // Mainnets
        1: "https://eth.llamarpc.com", // Ethereum Mainnet
        8453: "https://mainnet.base.org", // Base Mainnet
        1135: "https://rpc.api.lisk.com", // Lisk Mainnet
        
        // Testnets
        11155111: "https://ethereum-sepolia-rpc.publicnode.com", // Ethereum Sepolia
        84532: "https://sepolia.base.org", // Base Sepolia
        4202: "https://rpc.sepolia-api.lisk.com", // Lisk Sepolia
      };

      const rpcUrl = rpcUrls[chainId];
      if (!rpcUrl) {
        throw new Error(`No RPC URL for chain ID ${chainId}`);
      }

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, chainId);
      this.providers.set(chainId, provider);
    }
    return this.providers.get(chainId)!;
  }

  /**
   * Get signer from secure storage
   */
  private async getSigner(chainId: number): Promise<ethers.Wallet> {
    const provider = this.getProvider(chainId);
    
    // Get password from secure storage
    const password = await secureStorage.getSecureItem("blockfinax.password");
    if (!password) {
      throw new Error("Password not found. Please unlock your wallet.");
    }
    
    // Get decrypted private key
    const privateKey = await secureStorage.getDecryptedPrivateKey(password);
    if (!privateKey) {
      throw new Error("No private key found. Please unlock your wallet.");
    }
    
    return new ethers.Wallet(privateKey, provider);
  }

  /**
   * Get Diamond staking contract (LiquidityPoolFacet)
   */
  private async getStakingContract(
    chainId: number,
    withSigner = false
  ): Promise<ethers.Contract> {
    const diamondAddress = DIAMOND_ADDRESSES[chainId];
    if (!diamondAddress) {
      throw new Error(`Staking not deployed on chain ${chainId}`);
    }

    const provider = withSigner
      ? await this.getSigner(chainId)
      : this.getProvider(chainId);

    if (!this.stakingContracts.has(chainId) || withSigner) {
      const contract = new ethers.Contract(
        diamondAddress,
        LIQUIDITY_POOL_FACET_ABI,
        provider
      );
      this.stakingContracts.set(chainId, contract);
    }

    return this.stakingContracts.get(chainId)!;
  }

  /**
   * Get Diamond governance contract (GovernanceFacet)
   */
  private async getGovernanceContract(
    chainId: number
  ): Promise<ethers.Contract> {
    const diamondAddress = DIAMOND_ADDRESSES[chainId];
    if (!diamondAddress) {
      throw new Error(`Staking not deployed on chain ${chainId}`);
    }

    const provider = this.getProvider(chainId);

    if (!this.governanceContracts.has(chainId)) {
      const contract = new ethers.Contract(
        diamondAddress,
        GOVERNANCE_FACET_ABI,
        provider
      );
      this.governanceContracts.set(chainId, contract);
    }

    return this.governanceContracts.get(chainId)!;
  }

  /**
   * Get ERC20 token contract
   */
  private getTokenContract(
    tokenAddress: string,
    chainId: number,
    signer?: ethers.Signer
  ): ethers.Contract {
    const provider = signer || this.getProvider(chainId);
    return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  }

  /**
   * Get all supported staking tokens from contract
   */
  async getSupportedTokens(chainId: number): Promise<string[]> {
    try {
      const governanceContract = await this.getGovernanceContract(chainId);
      const tokens = await governanceContract.getSupportedStakingTokens();
      console.log(`[MultiToken] Supported tokens on chain ${chainId}:`, tokens);
      return tokens;
    } catch (error) {
      console.error(`Failed to get supported tokens for chain ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Check if a token is supported
   */
  async isTokenSupported(
    tokenAddress: string,
    chainId: number
  ): Promise<boolean> {
    try {
      const governanceContract = await this.getGovernanceContract(chainId);
      return await governanceContract.isTokenSupported(tokenAddress);
    } catch (error) {
      console.error("Failed to check token support:", error);
      return false;
    }
  }

  /**
   * Get total staked amount for a specific token
   */
  async getTotalStakedForToken(
    tokenAddress: string,
    chainId: number
  ): Promise<string> {
    try {
      const governanceContract = await this.getGovernanceContract(chainId);
      const totalStaked = await governanceContract.getTotalStakedForToken(tokenAddress);
      
      // Find token config to get decimals
      const supportedTokens = getSupportedStablecoins(chainId);
      const tokenConfig = supportedTokens.find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      
      if (!tokenConfig) {
        console.warn(`Token ${tokenAddress} not found in config`);
        return "0";
      }
      
      return ethers.utils.formatUnits(totalStaked, tokenConfig.decimals);
    } catch (error) {
      console.error(`Failed to get total staked for token ${tokenAddress}:`, error);
      return "0";
    }
  }

  /**
   * Get all user stakes across all supported tokens
   */
  async getAllUserStakes(
    userAddress: string,
    chainId: number
  ): Promise<MultiTokenUserStakes> {
    try {
      const stakingContract = await this.getStakingContract(chainId);
      const supportedTokens = getSupportedStablecoins(chainId);

      console.log(`[MultiToken] Getting all stakes for ${userAddress} on chain ${chainId}`);
      console.log(`[MultiToken] Supported tokens from config:`, supportedTokens.map(t => ({
        symbol: t.symbol,
        address: t.address
      })));

      // Call getAllStakesForUser from contract
      const result = await stakingContract.getAllStakesForUser(userAddress);
      const [tokens, amounts, usdEquivalents, isFinancierFlags, deadlines, pendingRewards, totalUsdValue] = result;

      console.log(`[MultiToken] Contract returned:`, {
        tokens,
        amounts: amounts.map((a: ethers.BigNumber) => a.toString()),
        usdEquivalents: usdEquivalents.map((u: ethers.BigNumber) => u.toString()),
        totalUsdValue: totalUsdValue.toString()
      });

      const stakes: TokenStakeInfo[] = [];
      let totalVotingPower = ethers.BigNumber.from(0);
      let earliestDeadline = Number.MAX_SAFE_INTEGER;
      let hasFinancierStake = false;

      for (let i = 0; i < tokens.length; i++) {
        if (amounts[i].isZero()) {
          console.log(`[MultiToken] Skipping zero stake for token ${tokens[i]}`);
          continue;
        }

        // Find token config
        const tokenConfig = supportedTokens.find(
          (t) => t.address.toLowerCase() === tokens[i].toLowerCase()
        );

        if (!tokenConfig) {
          console.warn(`[MultiToken] Token ${tokens[i]} not found in config`);
          continue;
        }

        // Get detailed stake info for this token
        const stakeDetails = await stakingContract.getStakeForToken(userAddress, tokens[i]);
        const [amount, timestamp, active, usdEquivalent, deadline, isFinancier, pendingReward, votingPower] = stakeDetails;

        if (!active) {
          console.log(`[MultiToken] Skipping inactive stake for ${tokenConfig.symbol}`);
          continue;
        }

        const stakeInfo: TokenStakeInfo = {
          tokenAddress: tokens[i],
          tokenSymbol: tokenConfig.symbol,
          tokenDecimals: tokenConfig.decimals,
          amount: ethers.utils.formatUnits(amount, tokenConfig.decimals),
          amountRaw: amount,
          usdValue: parseFloat(ethers.utils.formatEther(usdEquivalent)),
          timestamp: timestamp.toNumber(),
          deadline: deadline.toNumber(),
          pendingRewards: ethers.utils.formatUnits(pendingReward, tokenConfig.decimals),
          pendingRewardsRaw: pendingReward,
          votingPower: ethers.utils.formatUnits(votingPower, tokenConfig.decimals),
          active,
          isFinancier,
        };

        console.log(`[MultiToken] Added stake:`, {
          symbol: tokenConfig.symbol,
          amount: stakeInfo.amount,
          usdValue: stakeInfo.usdValue,
          isFinancier
        });

        stakes.push(stakeInfo);
        totalVotingPower = totalVotingPower.add(votingPower);
        
        if (deadline.toNumber() < earliestDeadline) {
          earliestDeadline = deadline.toNumber();
        }
        
        if (isFinancier) {
          hasFinancierStake = true;
        }
      }

      const now = Math.floor(Date.now() / 1000);
      const canUnstake = earliestDeadline <= now;
      const timeUntilUnlock = earliestDeadline > now ? earliestDeadline - now : 0;

      const result_data: MultiTokenUserStakes = {
        stakes,
        totalStakedUSD: parseFloat(ethers.utils.formatEther(totalUsdValue)),
        totalVotingPower: ethers.utils.formatEther(totalVotingPower),
        isFinancier: hasFinancierStake,
        canUnstake,
        timeUntilUnlock,
        earliestDeadline,
      };

      console.log(`[MultiToken] Final result:`, {
        stakesCount: stakes.length,
        totalUSD: result_data.totalStakedUSD,
        isFinancier: hasFinancierStake
      });

      return result_data;
    } catch (error) {
      console.error(`[MultiToken] Failed to get all user stakes:`, error);
      return {
        stakes: [],
        totalStakedUSD: 0,
        totalVotingPower: "0",
        isFinancier: false,
        canUnstake: false,
        timeUntilUnlock: 0,
        earliestDeadline: 0,
      };
    }
  }

  /**
   * Get pool statistics for all tokens
   */
  async getMultiTokenPoolStats(
    chainId: number
  ): Promise<MultiTokenPoolStats> {
    try {
      const stakingContract = await this.getStakingContract(chainId);
      const governanceContract = await this.getGovernanceContract(chainId);
      const supportedTokens = getSupportedStablecoins(chainId);

      // Get supported tokens from contract
      const tokenAddresses = await governanceContract.getSupportedStakingTokens();

      const perToken: TokenPoolStats[] = [];
      let totalStakedUSD = 0;

      for (const tokenAddress of tokenAddresses) {
        const tokenConfig = supportedTokens.find(
          (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
        );

        if (!tokenConfig) continue;

        try {
          const totalStaked = await governanceContract.getTotalStakedForToken(
            tokenAddress
          );
          const totalStakedFormatted = ethers.utils.formatUnits(
            totalStaked,
            tokenConfig.decimals
          );
          const usdValue = await convertToUSD(
            parseFloat(totalStakedFormatted),
            tokenConfig.symbol,
            chainId
          );

          perToken.push({
            tokenAddress,
            tokenSymbol: tokenConfig.symbol,
            totalStaked: totalStakedFormatted,
            totalStakedUSD: usdValue,
          });

          totalStakedUSD += usdValue;
        } catch (error) {
          console.error(
            `Failed to get pool stats for ${tokenConfig.symbol}:`,
            error
          );
        }
      }

      // Get general pool stats
      const poolStats = await stakingContract.getPoolStats();
      const currentAPR = poolStats.currentRewardRate.toNumber() / 100;

      return {
        perToken,
        totalStakedUSD,
        totalStakers: poolStats.totalLiquidityProviders.toNumber(),
        currentAPR,
      };
    } catch (error) {
      console.error("Failed to get multi-token pool stats:", error);
      throw error;
    }
  }

  /**
   * Get token balance for user
   */
  async getTokenBalance(
    userAddress: string,
    tokenAddress: string,
    chainId: number
  ): Promise<string> {
    try {
      const tokenConfig = getSupportedStablecoins(chainId).find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      if (!tokenConfig) {
        throw new Error("Token not found in config");
      }

      const tokenContract = this.getTokenContract(tokenAddress, chainId);
      const balance = await tokenContract.balanceOf(userAddress);
      return ethers.utils.formatUnits(balance, tokenConfig.decimals);
    } catch (error) {
      console.error("Failed to get token balance:", error);
      return "0";
    }
  }

  /**
   * Check token allowance
   */
  async checkAllowance(
    userAddress: string,
    tokenAddress: string,
    chainId: number
  ): Promise<string> {
    try {
      const tokenConfig = getSupportedStablecoins(chainId).find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      if (!tokenConfig) {
        throw new Error("Token not found in config");
      }

      const diamondAddress = DIAMOND_ADDRESSES[chainId];
      const tokenContract = this.getTokenContract(tokenAddress, chainId);
      const allowance = await tokenContract.allowance(userAddress, diamondAddress);
      return ethers.utils.formatUnits(allowance, tokenConfig.decimals);
    } catch (error) {
      console.error("Failed to check allowance:", error);
      return "0";
    }
  }

  /**
   * Approve token spending
   */
  async approveToken(
    tokenAddress: string,
    amount: string,
    chainId: number,
    onProgress?: (message: string) => void
  ): Promise<StakingTransaction> {
    try {
      const signer = await this.getSigner(chainId);
      const userAddress = await signer.getAddress();
      const tokenConfig = getSupportedStablecoins(chainId).find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      if (!tokenConfig) {
        throw new Error("Token not supported");
      }

      onProgress?.(`Approving ${tokenConfig.symbol}...`);

      const tokenContract = this.getTokenContract(tokenAddress, chainId, signer);
      const diamondAddress = DIAMOND_ADDRESSES[chainId];
      const amountWei = ethers.utils.parseUnits(amount, tokenConfig.decimals);

      const tx = await tokenContract.approve(diamondAddress, amountWei);
      onProgress?.("Waiting for approval confirmation...");
      
      await tx.wait();

      return {
        hash: tx.hash,
        type: "approve",
        tokenAddress,
        tokenSymbol: tokenConfig.symbol,
        amount,
        timestamp: Date.now(),
        status: "confirmed",
      };
    } catch (error: any) {
      console.error("Failed to approve token:", error);
      throw error;
    }
  }

  /**
   * Stake tokens
   */
  async stakeToken(
    tokenAddress: string,
    amount: string,
    customDeadline: number,
    chainId: number,
    asFinancier: boolean = false,
    onProgress?: (stage: string, message: string) => void
  ): Promise<StakingTransaction> {
    try {
      const signer = await this.getSigner(chainId);
      const userAddress = await signer.getAddress();
      
      const tokenConfig = getSupportedStablecoins(chainId).find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      if (!tokenConfig) {
        throw new Error("Token not supported");
      }

      onProgress?.("checking", `Checking ${tokenConfig.symbol} balance...`);

      // Check balance
      const balance = await this.getTokenBalance(userAddress, tokenAddress, chainId);
      if (parseFloat(balance) < parseFloat(amount)) {
        throw new Error(`Insufficient ${tokenConfig.symbol} balance`);
      }

      // Check and approve if needed
      const allowance = await this.checkAllowance(userAddress, tokenAddress, chainId);
      if (parseFloat(allowance) < parseFloat(amount)) {
        onProgress?.("approving", `Approving ${tokenConfig.symbol}...`);
        await this.approveToken(tokenAddress, amount, chainId, (msg) =>
          onProgress?.("approving", msg)
        );
      }

      // Calculate USD equivalent
      const usdEquivalent = await convertToUSD(
        parseFloat(amount),
        tokenConfig.symbol,
        chainId
      );
      const usdEquivalentWei = ethers.utils.parseEther(usdEquivalent.toString());

      onProgress?.("staking", `Staking ${amount} ${tokenConfig.symbol}...`);

      const stakingContract = await this.getStakingContract(chainId, true);
      const amountWei = ethers.utils.parseUnits(amount, tokenConfig.decimals);

      const tx = asFinancier
        ? await stakingContract.stakeTokenAsFinancier(
            tokenAddress,
            amountWei,
            customDeadline,
            usdEquivalentWei
          )
        : await stakingContract.stakeToken(
            tokenAddress,
            amountWei,
            customDeadline,
            usdEquivalentWei
          );

      onProgress?.("staking", "Waiting for transaction confirmation...");
      await tx.wait();

      return {
        hash: tx.hash,
        type: "stake",
        tokenAddress,
        tokenSymbol: tokenConfig.symbol,
        amount,
        timestamp: Date.now(),
        status: "confirmed",
      };
    } catch (error: any) {
      console.error("Failed to stake token:", error);
      throw error;
    }
  }

  /**
   * Unstake tokens
   */
  async unstakeToken(
    tokenAddress: string,
    amount: string,
    chainId: number,
    onProgress?: (message: string) => void
  ): Promise<StakingTransaction> {
    try {
      const tokenConfig = getSupportedStablecoins(chainId).find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      if (!tokenConfig) {
        throw new Error("Token not supported");
      }

      onProgress?.(`Unstaking ${amount} ${tokenConfig.symbol}...`);

      const stakingContract = await this.getStakingContract(chainId, true);
      const amountWei = ethers.utils.parseUnits(amount, tokenConfig.decimals);

      const tx = await stakingContract.unstakeToken(tokenAddress, amountWei);
      
      onProgress?.("Waiting for transaction confirmation...");
      await tx.wait();

      return {
        hash: tx.hash,
        type: "unstake",
        tokenAddress,
        tokenSymbol: tokenConfig.symbol,
        amount,
        timestamp: Date.now(),
        status: "confirmed",
      };
    } catch (error: any) {
      console.error("Failed to unstake token:", error);
      throw error;
    }
  }

  /**
   * Claim rewards for a specific token
   */
  async claimTokenRewards(
    tokenAddress: string,
    chainId: number,
    onProgress?: (message: string) => void
  ): Promise<StakingTransaction> {
    try {
      const tokenConfig = getSupportedStablecoins(chainId).find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );
      if (!tokenConfig) {
        throw new Error("Token not supported");
      }

      onProgress?.(`Claiming ${tokenConfig.symbol} rewards...`);

      const stakingContract = await this.getStakingContract(chainId, true);
      const tx = await stakingContract.claimTokenRewards(tokenAddress);
      
      onProgress?.("Waiting for transaction confirmation...");
      await tx.wait();

      return {
        hash: tx.hash,
        type: "claim",
        tokenAddress,
        tokenSymbol: tokenConfig.symbol,
        timestamp: Date.now(),
        status: "confirmed",
      };
    } catch (error: any) {
      console.error("Failed to claim rewards:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const multiTokenStakingService = new MultiTokenStakingService();

// Export helper functions
export function isStakingSupportedOnNetwork(chainId: number): boolean {
  return chainId in DIAMOND_ADDRESSES;
}

export function getDiamondAddress(chainId: number): string | null {
  return DIAMOND_ADDRESSES[chainId] || null;
}

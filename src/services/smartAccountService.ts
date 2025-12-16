import { ethers } from "ethers";
import {
  createSmartAccountClient,
  SmartAccountClient,
} from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  createPublicClient,
  http,
  parseEther,
  Address,
  Hash,
  Hex,
  encodeFunctionData,
  parseAbi,
  Chain,
} from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { WalletNetwork } from "@/contexts/WalletContext";
import {
  getPimlicoConfig,
  SMART_ACCOUNT_CONFIG,
  isSmartAccountEnabled,
} from "@/config/smartAccount";

/**
 * Smart Account Service
 * 
 * Provides ERC-4337 Account Abstraction features:
 * - Gasless transactions via Pimlico paymaster
 * - Batch transactions (multiple ops in one)
 * - Deterministic smart account addresses
 * - Works with any EOA (seed phrase, private key, social login)
 */

export interface SmartAccountInfo {
  address: Address;
  eoaAddress: Address;
  isDeployed: boolean;
  network: WalletNetwork;
}

export interface BatchTransaction {
  to: Address;
  value: bigint;
  data?: Hex;
  abi?: any[];
  functionName?: string;
  args?: any[];
}

export interface SendTransactionParams {
  to: Address;
  value?: string; // ETH amount in ether (e.g., "0.1")
  data?: Hex;
  gasless?: boolean; // Use paymaster for gas sponsorship
}

export interface BatchTransactionParams {
  transactions: BatchTransaction[];
  gasless?: boolean;
}

/**
 * Convert ethers Wallet to viem Account
 */
function walletToViemAccount(wallet: ethers.Wallet) {
  return privateKeyToAccount(wallet.privateKey as Hex);
}

/**
 * Convert WalletNetwork to viem Chain
 */
function toViemChain(network: WalletNetwork): Chain {
  return {
    id: network.chainId,
    name: network.name,
    nativeCurrency: {
      name: network.primaryCurrency,
      symbol: network.primaryCurrency,
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [network.rpcUrl, ...(network.rpcFallbacks || [])],
      },
      public: {
        http: [network.rpcUrl],
      },
    },
    blockExplorers: network.explorerUrl
      ? {
          default: {
            name: "Explorer",
            url: network.explorerUrl,
          },
        }
      : undefined,
    testnet: network.isTestnet,
  } as Chain;
}

/**
 * Smart Account Service Class
 */
export class SmartAccountService {
  private smartAccountClient: SmartAccountClient | null = null;
  private currentNetwork: WalletNetwork | null = null;
  private currentEOA: Address | null = null;

  /**
   * Initialize smart account client for a wallet
   */
  async initializeSmartAccount(
    wallet: ethers.Wallet,
    network: WalletNetwork
  ): Promise<SmartAccountInfo | null> {
    try {
      if (!isSmartAccountEnabled()) {
        console.warn("Smart accounts not enabled - missing Pimlico API key");
        return null;
      }

      const pimlicoConfig = getPimlicoConfig(network.id);
      if (!pimlicoConfig) {
        console.warn(`Smart accounts not supported on ${network.name}`);
        return null;
      }

      console.log("🔐 Initializing smart account...", {
        network: network.name,
        eoaAddress: wallet.address,
      });

      const viemChain = toViemChain(network);
      const owner = walletToViemAccount(wallet);

      // Create public client for reading blockchain state
      const publicClient = createPublicClient({
        chain: viemChain,
        transport: http(network.rpcUrl),
      });

      // Create Pimlico bundler/paymaster client
      const pimlicoClient = createPimlicoClient({
        transport: http(pimlicoConfig.bundlerUrl),
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7",
        },
      });

      // Create Simple Smart Account
      // This generates a deterministic address based on the EOA owner
      const simpleAccount = await toSimpleSmartAccount({
        client: publicClient,
        owner,
        entryPoint: {
          address: entryPoint07Address,
          version: "0.7",
        },
      });

      console.log("📍 Smart Account Address:", simpleAccount.address);

      // Create smart account client for sending transactions
      this.smartAccountClient = createSmartAccountClient({
        account: simpleAccount,
        chain: viemChain,
        bundlerTransport: http(pimlicoConfig.bundlerUrl),
        paymaster: pimlicoClient,
        paymasterContext: SMART_ACCOUNT_CONFIG.sponsorshipPolicyId
          ? { sponsorshipPolicyId: SMART_ACCOUNT_CONFIG.sponsorshipPolicyId }
          : undefined,
        userOperation: {
          estimateFeesPerGas: async () => {
            const gasPrice = await pimlicoClient.getUserOperationGasPrice();
            return gasPrice.fast;
          },
        },
      });

      this.currentNetwork = network;
      this.currentEOA = wallet.address as Address;

      // Check if account is deployed
      const code = await publicClient.getCode({ address: simpleAccount.address });
      const isDeployed = code !== undefined && code !== "0x";

      console.log("✅ Smart account initialized:", {
        smartAccountAddress: simpleAccount.address,
        eoaAddress: wallet.address,
        isDeployed,
        network: network.name,
      });

      return {
        address: simpleAccount.address,
        eoaAddress: wallet.address as Address,
        isDeployed,
        network,
      };
    } catch (error) {
      console.error("Failed to initialize smart account:", error);
      return null;
    }
  }

  /**
   * Send a single transaction
   * Can be gasless if paymaster sponsorship is enabled
   */
  async sendTransaction(params: SendTransactionParams): Promise<Hash | null> {
    if (!this.smartAccountClient) {
      throw new Error("Smart account not initialized");
    }

    try {
      console.log("📤 Sending smart account transaction:", params);

      // Use sendUserOperation for smart accounts with the calls parameter
      const userOpHash = await this.smartAccountClient.sendUserOperation({
        calls: [{
          to: params.to,
          value: params.value ? parseEther(params.value) : BigInt(0),
          data: params.data || ("0x" as Hex),
        }],
      });

      console.log("✅ UserOperation sent:", userOpHash);
      return userOpHash;
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw error;
    }
  }

  /**
   * Send batch transactions
   * Multiple operations in a single user operation
   */
  async sendBatchTransactions(
    params: BatchTransactionParams
  ): Promise<Hash | null> {
    if (!this.smartAccountClient) {
      throw new Error("Smart account not initialized");
    }

    try {
      console.log("📦 Sending batch transaction:", params);

      // Format batch calls
      const calls = params.transactions.map((tx) => {
        if (tx.functionName && tx.abi) {
          // Contract interaction with ABI
          return {
            to: tx.to,
            value: tx.value,
            abi: tx.abi,
            functionName: tx.functionName,
            args: tx.args || [],
          };
        } else {
          // Simple transfer or raw data
          return {
            to: tx.to,
            value: tx.value,
            data: tx.data || ("0x" as Hex),
          };
        }
      });

      const userOpHash = await this.smartAccountClient.sendUserOperation({
        calls: calls as any,
      });

      console.log("✅ Batch transaction sent:", userOpHash);
      return userOpHash;
    } catch (error) {
      console.error("Failed to send batch transaction:", error);
      throw error;
    }
  }

  /**
   * Send ERC-20 token transfer
   */
  async sendTokenTransfer(
    tokenAddress: Address,
    recipientAddress: Address,
    amount: string,
    decimals: number = 18
  ): Promise<Hash | null> {
    if (!this.smartAccountClient) {
      throw new Error("Smart account not initialized");
    }

    try {
      const ERC20_ABI = parseAbi([
        "function transfer(address to, uint256 amount) returns (bool)",
      ]);

      // Calculate token amount with decimals
      const tokenAmount = BigInt(
        Math.floor(parseFloat(amount) * Math.pow(10, decimals))
      );

      console.log("💰 Sending token transfer:", {
        token: tokenAddress,
        to: recipientAddress,
        amount: amount,
        tokenAmount: tokenAmount.toString(),
      });

      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipientAddress, tokenAmount],
      });

      const userOpHash = await this.smartAccountClient.sendUserOperation({
        calls: [{
          to: tokenAddress,
          data,
          value: BigInt(0),
        }],
      });

      console.log("✅ Token transfer sent:", userOpHash);
      return userOpHash;
    } catch (error) {
      console.error("Failed to send token transfer:", error);
      throw error;
    }
  }

  /**
   * Get smart account address (predictable address)
   */
  getSmartAccountAddress(): Address | null {
    return this.smartAccountClient?.account?.address || null;
  }

  /**
   * Get EOA address (owner)
   */
  getEOAAddress(): Address | null {
    return this.currentEOA;
  }

  /**
   * Check if smart account is initialized
   */
  isInitialized(): boolean {
    return this.smartAccountClient !== null;
  }

  /**
   * Reset smart account client
   */
  reset(): void {
    this.smartAccountClient = null;
    this.currentNetwork = null;
    this.currentEOA = null;
  }

  /**
   * Estimate user operation gas
   */
  async estimateUserOperationGas(params: SendTransactionParams) {
    if (!this.smartAccountClient) {
      throw new Error("Smart account not initialized");
    }

    try {
      // This will be sponsored if paymaster is configured
      const estimate = await this.smartAccountClient.estimateUserOperationGas({
        calls: [
          {
            to: params.to,
            value: params.value ? parseEther(params.value) : BigInt(0),
            data: params.data || ("0x" as Hex),
          },
        ],
      });

      return estimate;
    } catch (error) {
      console.error("Failed to estimate gas:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const smartAccountService = new SmartAccountService();

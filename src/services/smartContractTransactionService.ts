/**
 * Smart Contract Transaction Service
 * 
 * Unified service for executing smart contract transactions with Account Abstraction support
 * and automatic fallback to EOA when AA conditions are not met.
 * 
 * Features:
 * - Automatic Smart Account → EOA address linking on first transaction
 * - Gasless transactions via Alchemy AA (when conditions met)
 * - Automatic fallback to EOA when:
 *   - Network doesn't support AA
 *   - Gas sponsorship limit reached
 *   - Smart account initialization fails
 *   - User explicitly chooses EOA
 * - Batch transactions (approve + stake in single UserOp)
 */

import { ethers } from "ethers";
import { AlchemyAccountService, TransactionCall } from "./alchemyAccountService";
import { isAlchemyNetworkSupported, isConfiguredInAlchemyDashboard, getAlchemyGasPolicyId } from "@/config/alchemyAccount";
import { gaslessLimitService } from "./gaslessLimitService";
import { WalletNetwork } from "@/contexts/WalletContext";
import { Hex, encodeFunctionData, parseAbi } from "viem";

export interface TransactionOptions {
  // Contract interaction
  contractAddress: string;
  abi: any[];
  functionName: string;
  args: any[];
  value?: string; // ETH value in ether (e.g., "0.1")

  // Network & wallet
  network: WalletNetwork;
  privateKey: string;

  // AA preferences
  preferSmartAccount?: boolean; // Default: true if AA supported
  forceEOA?: boolean; // Force EOA even if AA available

  // Gas sponsorship
  expectGasSponsorship?: boolean; // Default: true
}

export interface BatchTransactionOptions {
  transactions: Array<{
    contractAddress: string;
    abi: any[];
    functionName: string;
    args: any[];
    value?: string;
  }>;
  network: WalletNetwork;
  privateKey: string;
  preferSmartAccount?: boolean;
  forceEOA?: boolean;
  expectGasSponsorship?: boolean;
}

export interface TransactionResult {
  success: boolean;
  txHash: string;
  usedSmartAccount: boolean;
  explorerUrl: string;
  error?: string;
}

export interface SmartAccountLinkingStatus {
  isLinked: boolean;
  eoaAddress: string;
  smartAccountAddress?: string;
  needsLinking: boolean;
}

// AddressLinkingFacet ABI
const ADDRESS_LINKING_FACET_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "smartAccount", "type": "address" }],
    "name": "linkSmartAccount",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "getLinkedSmartAccount",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "smartAccount", "type": "address" }],
    "name": "getLinkedEOA",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "isSmartAccountLinked",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
];

class SmartContractTransactionService {
  private static instance: SmartContractTransactionService;
  private alchemyServices: Map<string, AlchemyAccountService> = new Map();
  private smartAccountAddresses: Map<string, string> = new Map(); // network -> smart account address

  private constructor() { }

  public static getInstance(): SmartContractTransactionService {
    if (!SmartContractTransactionService.instance) {
      SmartContractTransactionService.instance = new SmartContractTransactionService();
    }
    return SmartContractTransactionService.instance;
  }

  /**
   * Get or create Alchemy Account Service for network
   */
  private async getAlchemyService(
    network: WalletNetwork,
    privateKey: string
  ): Promise<AlchemyAccountService | null> {
    const networkKey = `${network.id}-${network.chainId}`;

    // Return cached service if exists
    if (this.alchemyServices.has(networkKey)) {
      const service = this.alchemyServices.get(networkKey)!;
      if (service.isInitialized()) {
        return service;
      }
    }

    // Check if network supports AA and is configured for it
    if (!isAlchemyNetworkSupported(network.id) || !isConfiguredInAlchemyDashboard(network.id)) {
      console.log(`[SmartContractTxService] Network ${network.name} does not have AA enabled/configured`);
      return null;
    }

    try {
      // Create and initialize new service
      const service = new AlchemyAccountService(network.id);
      const smartAccountAddress = await service.initializeSmartAccount(privateKey);

      this.alchemyServices.set(networkKey, service);
      this.smartAccountAddresses.set(networkKey, smartAccountAddress);

      console.log(`[SmartContractTxService] ✅ Smart Account initialized:`, smartAccountAddress);
      return service;
    } catch (error) {
      console.error(`[SmartContractTxService] Failed to initialize AA:`, error);
      return null;
    }
  }

  /**
   * Check if an address is a Diamond contract
   */
  private isDiamondAddress(address: string, chainId: number): boolean {
    // Import DIAMOND_ADDRESSES from stakingService
    const DIAMOND_ADDRESSES: { [chainId: number]: string } = {
      11155111: "0xA4d19a7b133d2A9fAce5b1ad407cA7b9D4Ee9284", // Ethereum Sepolia
      4202: "0xe133cd2ee4d835ac202942baff2b1d6d47862d34", // Lisk Sepolia
      84532: "0xb899a968e785dd721dbc40e71e2faed7b2d84711", // Base Sepolia
    };

    const diamondAddress = DIAMOND_ADDRESSES[chainId];
    if (!diamondAddress) return false;

    return address.toLowerCase() === diamondAddress.toLowerCase();
  }

  /**
   * Check if Smart Account is linked to EOA in the smart contract
   */
  async checkSmartAccountLinking(
    diamondAddress: string,
    eoaAddress: string,
    smartAccountAddress: string,
    network: WalletNetwork
  ): Promise<SmartAccountLinkingStatus> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl, {
        name: network.name,
        chainId: network.chainId,
      });

      const contract = new ethers.Contract(
        diamondAddress,
        ADDRESS_LINKING_FACET_ABI,
        provider
      );

      // Check if smart account is already linked
      const linkedSmartAccount = await contract.getLinkedSmartAccount(eoaAddress);
      const isLinked = linkedSmartAccount.toLowerCase() === smartAccountAddress.toLowerCase();

      return {
        isLinked,
        eoaAddress,
        smartAccountAddress,
        needsLinking: !isLinked && linkedSmartAccount === ethers.constants.AddressZero,
      };
    } catch (error) {
      console.warn("[SmartContractTxService] Linking check failed (skipping link):", error);
      return {
        isLinked: false,
        eoaAddress,
        smartAccountAddress,
        needsLinking: false,
      };
    }
  }

  /**
   * Link Smart Account to EOA in the smart contract
   * Should be called once when user first uses AA
   */
  async linkSmartAccountToEOA(
    diamondAddress: string,
    smartAccountAddress: string,
    network: WalletNetwork,
    privateKey: string
  ): Promise<TransactionResult> {
    console.log("[SmartContractTxService] Linking Smart Account to EOA...");

    try {
      // Always use EOA for linking transaction
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl, {
        name: network.name,
        chainId: network.chainId,
      });

      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(
        diamondAddress,
        ADDRESS_LINKING_FACET_ABI,
        wallet
      );

      const tx = await contract.linkSmartAccount(smartAccountAddress);
      const receipt = await tx.wait();

      console.log(`[SmartContractTxService] ✅ Smart Account linked! Tx:`, receipt.transactionHash);

      return {
        success: true,
        txHash: receipt.transactionHash,
        usedSmartAccount: false,
        explorerUrl: `${network.explorerUrl}/tx/${receipt.transactionHash}`,
      };
    } catch (error: any) {
      console.error("[SmartContractTxService] Failed to link Smart Account:", error);
      return {
        success: false,
        txHash: "",
        usedSmartAccount: false,
        explorerUrl: "",
        error: error.message || "Failed to link Smart Account",
      };
    }
  }

  /**
   * Execute a smart contract transaction with AA support and EOA fallback
   */
  async executeTransaction(options: TransactionOptions): Promise<TransactionResult> {
    const {
      contractAddress,
      abi,
      functionName,
      args,
      value,
      network,
      privateKey,
      preferSmartAccount = true,
      forceEOA = false,
      expectGasSponsorship = true,
    } = options;

    console.log(`[SmartContractTxService] Executing ${functionName}...`);

    // Determine if we should try AA (check with small proxy amount)
    const gaslessCheck = await gaslessLimitService.canUseGasless(0.01);
    const gasPolicyId = getAlchemyGasPolicyId();
    const aaSupported = isAlchemyNetworkSupported(network.id);
    const aaConfigured = isConfiguredInAlchemyDashboard(network.id);
    const gasSponsorConfigured = !!gasPolicyId;
    const shouldTryAA =
      !forceEOA &&
      preferSmartAccount &&
      aaSupported &&
      aaConfigured &&
      gaslessCheck.allowed &&
      (!expectGasSponsorship || gasSponsorConfigured);

    if (expectGasSponsorship && !gasSponsorConfigured) {
      console.log("[SmartContractTxService] Gas sponsorship requested but EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID is not set → skipping AA and using EOA");
    }

    if (!shouldTryAA) {
      console.log("[SmartContractTxService] 🔄 USING EOA FALLBACK (AA conditions not met or forced EOA)");
      return this.executeWithEOA(options);
    }

    // Try with Smart Account first
    try {
      const alchemyService = await this.getAlchemyService(network, privateKey);

      if (!alchemyService) {
        console.log("[SmartContractTxService] 🔄 USING EOA FALLBACK (AA service initialization failed)");
        return this.executeWithEOA(options);
      }

      const smartAccountAddress = alchemyService.getAccountAddress();
      if (!smartAccountAddress) {
        throw new Error("Smart account address not available");
      }

      // Check and perform linking if needed (only for Diamond contracts)
      // Diamond contracts have the AddressLinkingFacet, other contracts (like USDC) don't
      const isDiamondContract = this.isDiamondAddress(contractAddress, network.chainId);

      if (isDiamondContract) {
        const wallet = new ethers.Wallet(privateKey);
        const linkingStatus = await this.checkSmartAccountLinking(
          contractAddress,
          wallet.address,
          smartAccountAddress,
          network
        );

        if (linkingStatus.needsLinking) {
          console.log("[SmartContractTxService] 🔗 Linking Smart Account to EOA first...");
          const linkResult = await this.linkSmartAccountToEOA(
            contractAddress,
            smartAccountAddress,
            network,
            privateKey
          );

          if (!linkResult.success) {
            console.warn("[SmartContractTxService] Linking failed, proceeding with AA attempt");
          }
        }
      }

      // Execute with Smart Account
      console.log(`[SmartContractTxService] 🚀 USING ACCOUNT ABSTRACTION (AA): Executing ${functionName} via Smart Account...`);
      const result = await alchemyService.executeContractFunction(
        contractAddress as Hex,
        abi,
        functionName,
        args,
        {
          value: value ? BigInt(ethers.utils.parseEther(value).toString()) : 0n,
          gasSponsored: expectGasSponsorship,
        }
      );

      // Record gasless transaction (estimate ~$0.01 per tx)
      if (expectGasSponsorship) {
        await gaslessLimitService.recordTransaction(0.01, 'smart-account');
      }

      console.log(`[SmartContractTxService] ✅ Transaction sent via Smart Account:`, result.hash);

      return {
        success: true,
        txHash: result.hash,
        usedSmartAccount: true,
        explorerUrl: `${network.explorerUrl}/tx/${result.hash}`,
      };
    } catch (error: any) {
      console.error("[SmartContractTxService] AA transaction failed:", error);

      // Check if it's a gas sponsorship issue
      if (error.message?.includes("gas") || error.message?.includes("paymaster")) {
        console.log("[SmartContractTxService] Gas sponsorship issue, falling back to EOA");
      }

      // Fallback to EOA
      console.log("[SmartContractTxService] 🔄 USING EOA FALLBACK (AA attempt failed with error)");
      return this.executeWithEOA(options);
    }
  }

  /**
   * Execute transaction with EOA (traditional way)
   */
  private async executeWithEOA(options: TransactionOptions): Promise<TransactionResult> {
    const {
      contractAddress,
      abi,
      functionName,
      args,
      value,
      network,
      privateKey,
    } = options;

    console.log(`[SmartContractTxService] 🔄 USING EOA FALLBACK: Executing ${functionName} via traditional EOA...`);

    try {
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl, {
        name: network.name,
        chainId: network.chainId,
      });

      const wallet = new ethers.Wallet(privateKey, provider);
      const contract = new ethers.Contract(contractAddress, abi, wallet);

      const callOverrides = {
        value: value ? ethers.utils.parseEther(value) : 0,
      };

      try {
        await contract.callStatic[functionName](...args, callOverrides);
      } catch (error: any) {
        const reason =
          error?.reason ||
          error?.error?.message ||
          error?.message ||
          "Transaction precheck failed";
        throw new Error(reason);
      }

      let gasLimit: ethers.BigNumber | undefined;
      try {
        const estimatedGas = await contract.estimateGas[functionName](...args, callOverrides);
        gasLimit = estimatedGas.mul(120).div(100);
      } catch (error) {
        gasLimit = ethers.BigNumber.from(600000);
      }

      const tx = await contract[functionName](...args, {
        ...callOverrides,
        gasLimit,
      });

      const receipt = await tx.wait();

      console.log(`[SmartContractTxService] ✅ Transaction sent via EOA:`, receipt.transactionHash);

      return {
        success: true,
        txHash: receipt.transactionHash,
        usedSmartAccount: false,
        explorerUrl: `${network.explorerUrl}/tx/${receipt.transactionHash}`,
      };
    } catch (error: any) {
      console.error("[SmartContractTxService] EOA transaction failed:", error);
      return {
        success: false,
        txHash: "",
        usedSmartAccount: false,
        explorerUrl: "",
        error: error.message || "Transaction failed",
      };
    }
  }

  /**
   * Execute batch transactions (e.g., approve + stake)
   */
  async executeBatchTransaction(options: BatchTransactionOptions): Promise<TransactionResult> {
    const {
      transactions,
      network,
      privateKey,
      preferSmartAccount = true,
      forceEOA = false,
      expectGasSponsorship = true,
    } = options;

    console.log(`[SmartContractTxService] Executing batch transaction (${transactions.length} calls)...`);

    // Batch transactions only work with AA (check with small proxy amount per tx)
    const gaslessCheck = await gaslessLimitService.canUseGasless(0.01 * transactions.length);
    const gasPolicyId = getAlchemyGasPolicyId();
    const aaSupported = isAlchemyNetworkSupported(network.id);
    const aaConfigured = isConfiguredInAlchemyDashboard(network.id);
    const gasSponsorConfigured = !!gasPolicyId;
    const shouldTryAA =
      !forceEOA &&
      preferSmartAccount &&
      aaSupported &&
      aaConfigured &&
      gaslessCheck.allowed &&
      (!expectGasSponsorship || gasSponsorConfigured);

    if (expectGasSponsorship && !gasSponsorConfigured) {
      console.log("[SmartContractTxService] Gas sponsorship requested for batch but EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID is not set → executing via EOA");
    }

    if (!shouldTryAA) {
      console.log("[SmartContractTxService] 🔄 USING EOA FALLBACK (Batch requires AA, but conditions not met)");
      return this.executeBatchWithEOA(options);
    }

    try {
      const alchemyService = await this.getAlchemyService(network, privateKey);

      if (!alchemyService) {
        return this.executeBatchWithEOA(options);
      }

      // Prepare batch calls
      const calls: TransactionCall[] = transactions.map((tx) => ({
        target: tx.contractAddress as Hex,
        data: encodeFunctionData({
          abi:
            Array.isArray(tx.abi) && typeof tx.abi[0] === "string"
              ? parseAbi(tx.abi as string[])
              : tx.abi,
          functionName: tx.functionName,
          args: tx.args,
        }),
        value: tx.value ? BigInt(ethers.utils.parseEther(tx.value).toString()) : 0n,
      }));

      // Execute batch
      const result = await alchemyService.sendBatchUserOperation(calls, {
        gasSponsored: expectGasSponsorship,
      });

      // Record gasless transaction (estimate ~$0.01 per tx in batch)
      if (expectGasSponsorship) {
        await gaslessLimitService.recordTransaction(0.01 * transactions.length, 'smart-account-batch');
      }

      console.log(`[SmartContractTxService] 🚀 USING ACCOUNT ABSTRACTION (AA): Batch transaction sent:`, result.hash);

      return {
        success: true,
        txHash: result.hash,
        usedSmartAccount: true,
        explorerUrl: `${network.explorerUrl}/tx/${result.hash}`,
      };
    } catch (error: any) {
      console.error("[SmartContractTxService] Batch AA transaction failed:", error);
      console.log("[SmartContractTxService] 🔄 USING EOA FALLBACK (Batch AA failed, attempting sequential EOA)");
      return this.executeBatchWithEOA(options);
    }
  }

  /**
   * Execute batch transactions sequentially with EOA
   */
  private async executeBatchWithEOA(options: BatchTransactionOptions): Promise<TransactionResult> {
    const { transactions, network, privateKey } = options;

    try {
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl, {
        name: network.name,
        chainId: network.chainId,
      });

      const wallet = new ethers.Wallet(privateKey, provider);
      const txHashes: string[] = [];

      // Execute sequentially
      for (const tx of transactions) {
        const contract = new ethers.Contract(tx.contractAddress, tx.abi, wallet);
        const result = await contract[tx.functionName](...tx.args, {
          value: tx.value ? ethers.utils.parseEther(tx.value) : 0,
        });
        const receipt = await result.wait();
        txHashes.push(receipt.transactionHash);
      }

      const lastTxHash = txHashes[txHashes.length - 1];

      console.log(`[SmartContractTxService] ✅ Batch executed via EOA:`, txHashes);

      return {
        success: true,
        txHash: lastTxHash,
        usedSmartAccount: false,
        explorerUrl: `${network.explorerUrl}/tx/${lastTxHash}`,
      };
    } catch (error: any) {
      console.error("[SmartContractTxService] Batch EOA transaction failed:", error);
      return {
        success: false,
        txHash: "",
        usedSmartAccount: false,
        explorerUrl: "",
        error: error.message || "Batch transaction failed",
      };
    }
  }

  /**
   * Clear cached services (useful for logout)
   */
  clearCache(): void {
    this.alchemyServices.clear();
    this.smartAccountAddresses.clear();
  }
}

export const smartContractTransactionService = SmartContractTransactionService.getInstance();

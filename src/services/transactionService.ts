/**
 * Transaction Service
 * 
 * Handles all blockchain transaction operations including:
 * - Native token transfers (ETH, MATIC, BNB)
 * - ERC-20 token transfers (USDT, USDC, DAI, etc.)
 * - Gas estimation and management
 * - Transaction broadcasting and monitoring
 * 
 * Based on ethers.js v5 for maximum compatibility with React Native + Expo
 */

import { WalletNetwork } from "@/contexts/WalletContext";
import { secureStorage } from "@/utils/secureStorage";
import { ERC20_ABI, isValidAddress } from "@/utils/tokenUtils";
import { ethers } from "ethers";

const MNEMONIC_KEY = "blockfinax.mnemonic";
const PRIVATE_KEY = "blockfinax.privateKey";

export interface TransactionParams {
  recipientAddress: string;
  amount: string;
  tokenAddress?: string; // undefined for native token
  tokenDecimals?: number;
  network: WalletNetwork;
  gasLimit?: string;
  maxFeePerGas?: string; // For EIP-1559 transactions
  maxPriorityFeePerGas?: string; // For EIP-1559 transactions
}

export interface GasEstimate {
  gasLimit: ethers.BigNumber;
  gasPrice?: ethers.BigNumber; // Legacy
  maxFeePerGas?: ethers.BigNumber; // EIP-1559
  maxPriorityFeePerGas?: ethers.BigNumber; // EIP-1559
  estimatedCost: string; // In native currency
  estimatedCostUSD?: number;
}

export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  status: "pending" | "success" | "failed";
  timestamp: number;
  explorerUrl?: string;
}

export interface TransactionStatus {
  hash: string;
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
  blockNumber?: number;
  gasUsed?: ethers.BigNumber;
  effectiveGasPrice?: ethers.BigNumber;
}

class TransactionService {
  private static instance: TransactionService;

  public static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  /**
   * Get provider for a network
   */
  private getProvider(network: WalletNetwork): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(network.rpcUrl, {
      name: network.name,
      chainId: network.chainId,
    });
  }

  private providers = new Map<string, ethers.providers.JsonRpcProvider>();

  /**
   * Format amount string to prevent BigNumber precision issues
   */
  private formatAmountForParsing(amount: string, decimals: number): string {
    const maxDecimals = Math.min(decimals, 18);
    
    // Use regex to truncate decimal places instead of toFixed to avoid adding zeros
    const regex = new RegExp(`^\\d+(\\.\\d{0,${maxDecimals}})?`);
    const match = amount.match(regex);
    const formattedAmount = match ? match[0] : amount;
    
    console.log(`[TransactionService] Formatting amount: "${amount}" -> "${formattedAmount}" (decimals: ${decimals})`);
    
    return formattedAmount;
  }

  /**
   * Get signer (wallet) from secure storage
   */
  private async getSigner(
    network: WalletNetwork
  ): Promise<ethers.Wallet> {
    try {
      // Try to get mnemonic first
      const mnemonic = await secureStorage.getSecureItem(MNEMONIC_KEY);
      if (mnemonic) {
        const hdWallet = ethers.Wallet.fromMnemonic(mnemonic);
        const provider = this.getProvider(network);
        return hdWallet.connect(provider);
      }

      // Fallback to private key
      const privateKey = await secureStorage.getSecureItem(PRIVATE_KEY);
      if (!privateKey) {
        throw new Error("No wallet credentials found in secure storage");
      }

      const provider = this.getProvider(network);
      return new ethers.Wallet(privateKey, provider);
    } catch (error) {
      console.error("Error getting signer:", error);
      throw new Error("Failed to access wallet credentials");
    }
  }

  /**
   * Validate transaction parameters
   */
  private validateTransactionParams(params: TransactionParams): void {
    if (!isValidAddress(params.recipientAddress)) {
      throw new Error("Invalid recipient address");
    }

    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount");
    }

    // Validate amount precision to prevent BigNumber issues
    const decimals = params.tokenDecimals || 18;
    const maxPrecision = Math.min(decimals, 18);
    const decimalPlaces = (params.amount.split('.')[1] || '').length;
    if (decimalPlaces > maxPrecision) {
      console.warn(`Amount has ${decimalPlaces} decimal places, will be truncated to ${maxPrecision}`);
    }

    if (params.tokenAddress && !isValidAddress(params.tokenAddress)) {
      throw new Error("Invalid token contract address");
    }
  }

  /**
   * Check if network supports EIP-1559 (London hard fork)
   */
  private async supportsEIP1559(
    provider: ethers.providers.JsonRpcProvider
  ): Promise<boolean> {
    try {
      const feeData = await provider.getFeeData();
      return feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null;
    } catch {
      return false;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  public async estimateGas(
    params: TransactionParams
  ): Promise<GasEstimate> {
    this.validateTransactionParams(params);

    try {
      const signer = await this.getSigner(params.network);
      const provider = signer.provider as ethers.providers.JsonRpcProvider;
      const isEIP1559 = await this.supportsEIP1559(provider);

      let gasLimit: ethers.BigNumber;
      let estimatedCost: string;

      // Estimate gas based on transaction type
      if (!params.tokenAddress) {
        // Native token transfer - use parseEther directly
        let value: ethers.BigNumber;
        
        try {
          const cleanAmount = params.amount.toString().trim();
          value = ethers.utils.parseEther(cleanAmount);
        } catch (error) {
          throw new Error(`Invalid amount format for gas estimation: ${params.amount}`);
        }
        
        const tx = {
          to: params.recipientAddress,
          value: value,
        };
        gasLimit = await signer.estimateGas(tx);
      } else {
        // ERC-20 token transfer - use parseUnits directly
        const contract = new ethers.Contract(
          params.tokenAddress,
          ERC20_ABI,
          signer
        );
        const decimals = params.tokenDecimals || 18;
        
        let parsedAmount: ethers.BigNumber;
        
        try {
          const cleanAmount = params.amount.toString().trim();
          parsedAmount = ethers.utils.parseUnits(cleanAmount, decimals);
        } catch (error) {
          throw new Error(`Invalid amount format for ERC-20 gas estimation: ${params.amount}`);
        }
        
        gasLimit = await contract.estimateGas.transfer(
          params.recipientAddress,
          parsedAmount
        );
      }

      // Add 20% buffer to gas limit to prevent out-of-gas errors
      gasLimit = gasLimit.mul(120).div(100);

      // Get fee data
      const feeData = await provider.getFeeData();

      if (isEIP1559 && feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 transaction
        const totalCost = gasLimit.mul(feeData.maxFeePerGas);
        estimatedCost = ethers.utils.formatEther(totalCost);

        return {
          gasLimit,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          estimatedCost,
        };
      } else {
        // Legacy transaction
        const gasPrice = feeData.gasPrice || ethers.utils.parseUnits("20", "gwei");
        const totalCost = gasLimit.mul(gasPrice);
        estimatedCost = ethers.utils.formatEther(totalCost);

        return {
          gasLimit,
          gasPrice,
          estimatedCost,
        };
      }
    } catch (error) {
      console.error("Error estimating gas:", error);
      throw new Error("Failed to estimate transaction gas");
    }
  }

  /**
   * Send native token (ETH, MATIC, BNB, etc.)
   */
  private async sendNativeToken(
    params: TransactionParams,
    signer: ethers.Wallet,
    gasEstimate: GasEstimate
  ): Promise<ethers.providers.TransactionResponse> {
    // Use parseEther directly on the original amount string to avoid precision issues
    // parseEther already handles the conversion to wei (18 decimals) properly
    let value: ethers.BigNumber;
    
    try {
      // Clean the amount string and use parseEther directly
      const cleanAmount = params.amount.toString().trim();
      value = ethers.utils.parseEther(cleanAmount);
      console.log(`[TransactionService] Parsing amount: "${cleanAmount}" -> ${value.toString()} wei`);
    } catch (error) {
      console.error(`[TransactionService] Failed to parse amount: "${params.amount}"`, error);
      throw new Error(`Invalid amount format: ${params.amount}`);
    }
    
    const txRequest: ethers.providers.TransactionRequest = {
      to: params.recipientAddress,
      value: value,
      gasLimit: params.gasLimit 
        ? ethers.BigNumber.from(params.gasLimit) 
        : gasEstimate.gasLimit,
    };

    // Add gas pricing based on network support
    if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
      // EIP-1559
      console.log('[TransactionService] EIP-1559 gas params:', {
        'params.maxFeePerGas': params.maxFeePerGas,
        'gasEstimate.maxFeePerGas': gasEstimate.maxFeePerGas?.toString(),
        'params.maxPriorityFeePerGas': params.maxPriorityFeePerGas,
        'gasEstimate.maxPriorityFeePerGas': gasEstimate.maxPriorityFeePerGas?.toString(),
      });
      
      // Use the gas estimate values directly (they're already BigNumbers)
      txRequest.maxFeePerGas = params.maxFeePerGas
        ? (typeof params.maxFeePerGas === 'string' ? ethers.utils.parseUnits(params.maxFeePerGas, 'wei') : ethers.BigNumber.from(params.maxFeePerGas))
        : gasEstimate.maxFeePerGas;
      txRequest.maxPriorityFeePerGas = params.maxPriorityFeePerGas
        ? (typeof params.maxPriorityFeePerGas === 'string' ? ethers.utils.parseUnits(params.maxPriorityFeePerGas, 'wei') : ethers.BigNumber.from(params.maxPriorityFeePerGas))
        : gasEstimate.maxPriorityFeePerGas;
    } else if (gasEstimate.gasPrice) {
      // Legacy
      txRequest.gasPrice = gasEstimate.gasPrice;
    }

    return signer.sendTransaction(txRequest);
  }

  /**
   * Send ERC-20 token
   */
  private async sendERC20Token(
    params: TransactionParams,
    signer: ethers.Wallet,
    gasEstimate: GasEstimate
  ): Promise<ethers.providers.TransactionResponse> {
    if (!params.tokenAddress) {
      throw new Error("Token address is required for ERC-20 transfers");
    }

    const contract = new ethers.Contract(
      params.tokenAddress,
      ERC20_ABI,
      signer
    );

    const decimals = params.tokenDecimals || 18;
    
    // Use parseUnits directly on the original amount string to avoid precision issues
    let parsedAmount: ethers.BigNumber;
    
    try {
      const cleanAmount = params.amount.toString().trim();
      parsedAmount = ethers.utils.parseUnits(cleanAmount, decimals);
      console.log(`[TransactionService] Parsing ERC-20 amount: "${cleanAmount}" with ${decimals} decimals -> ${parsedAmount.toString()}`);
    } catch (error) {
      console.error(`[TransactionService] Failed to parse ERC-20 amount: "${params.amount}" with ${decimals} decimals`, error);
      throw new Error(`Invalid amount format: ${params.amount}`);
    }

    const txOptions: ethers.Overrides = {
      gasLimit: params.gasLimit
        ? ethers.BigNumber.from(params.gasLimit)
        : gasEstimate.gasLimit,
    };

    // Add gas pricing
    if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
      // Use the gas estimate values directly (they're already BigNumbers)
      txOptions.maxFeePerGas = params.maxFeePerGas
        ? (typeof params.maxFeePerGas === 'string' ? ethers.utils.parseUnits(params.maxFeePerGas, 'wei') : ethers.BigNumber.from(params.maxFeePerGas))
        : gasEstimate.maxFeePerGas;
      txOptions.maxPriorityFeePerGas = params.maxPriorityFeePerGas
        ? (typeof params.maxPriorityFeePerGas === 'string' ? ethers.utils.parseUnits(params.maxPriorityFeePerGas, 'wei') : ethers.BigNumber.from(params.maxPriorityFeePerGas))
        : gasEstimate.maxPriorityFeePerGas;
    } else if (gasEstimate.gasPrice) {
      txOptions.gasPrice = gasEstimate.gasPrice;
    }

    return contract.transfer(params.recipientAddress, parsedAmount, txOptions);
  }

  /**
   * Send transaction (main entry point)
   */
  public async sendTransaction(
    params: TransactionParams
  ): Promise<TransactionResult> {
    this.validateTransactionParams(params);

    try {
      const signer = await this.getSigner(params.network);
      
      // Estimate gas first
      const gasEstimate = await this.estimateGas(params);

      // Check balance
      await this.checkSufficientBalance(params, signer, gasEstimate);

      // Send transaction
      let txResponse: ethers.providers.TransactionResponse;
      
      if (!params.tokenAddress) {
        txResponse = await this.sendNativeToken(params, signer, gasEstimate);
      } else {
        txResponse = await this.sendERC20Token(params, signer, gasEstimate);
      }

      // Build explorer URL
      const explorerUrl = params.network.explorerUrl
        ? `${params.network.explorerUrl}/tx/${txResponse.hash}`
        : undefined;

      return {
        hash: txResponse.hash,
        from: txResponse.from,
        to: txResponse.to || params.recipientAddress,
        value: params.amount,
        status: "pending",
        timestamp: Date.now(),
        explorerUrl,
      };
    } catch (error: any) {
      console.error("Error sending transaction:", error);
      
      // Parse common errors
      if (error.code === "INSUFFICIENT_FUNDS") {
        throw new Error("Insufficient funds to complete this transaction");
      } else if (error.code === "NONCE_EXPIRED") {
        throw new Error("Transaction nonce expired. Please try again");
      } else if (error.code === "REPLACEMENT_UNDERPRICED") {
        throw new Error("Gas price too low. Please increase gas price");
      } else if (error.message?.includes("user rejected")) {
        throw new Error("Transaction was rejected");
      }
      
      throw new Error(error.message || "Failed to send transaction");
    }
  }

  /**
   * Check if wallet has sufficient balance
   */
  private async checkSufficientBalance(
    params: TransactionParams,
    signer: ethers.Wallet,
    gasEstimate: GasEstimate
  ): Promise<void> {
    const address = await signer.getAddress();
    const provider = signer.provider as ethers.providers.JsonRpcProvider;

    // Check native token balance for gas
    const nativeBalance = await provider.getBalance(address);
    
    // Convert estimatedCost from ETH string to BigNumber (wei)
    // estimatedCost is in ETH format (e.g., "0.000038"), so use parseEther
    console.log(`[TransactionService] Gas estimate - estimatedCost: "${gasEstimate.estimatedCost}"`);
    
    let gasCost: ethers.BigNumber;
    try {
      gasCost = ethers.utils.parseEther(gasEstimate.estimatedCost);
      console.log(`[TransactionService] Gas cost in wei: ${gasCost.toString()}`);
    } catch (error) {
      console.error(`[TransactionService] Failed to parse gas cost: "${gasEstimate.estimatedCost}"`, error);
      throw new Error(`Invalid gas cost format: ${gasEstimate.estimatedCost}`);
    }

    if (!params.tokenAddress) {
      // Native token transfer - need amount + gas
      // Use parseEther directly to avoid precision issues
      let amountInWei: ethers.BigNumber;
      
      try {
        const cleanAmount = params.amount.toString().trim();
        amountInWei = ethers.utils.parseEther(cleanAmount);
      } catch (error) {
        throw new Error(`Invalid amount format for balance check: ${params.amount}`);
      }
      
      const totalRequired = amountInWei.add(gasCost);
      if (nativeBalance.lt(totalRequired)) {
        throw new Error(
          `Insufficient ${params.network.primaryCurrency} balance. ` +
          `Required: ${ethers.utils.formatEther(totalRequired)}, ` +
          `Available: ${ethers.utils.formatEther(nativeBalance)}`
        );
      }
    } else {
      // ERC-20 transfer - need gas in native token
      if (nativeBalance.lt(gasCost)) {
        throw new Error(
          `Insufficient ${params.network.primaryCurrency} for gas fees. ` +
          `Required: ${gasEstimate.estimatedCost}, ` +
          `Available: ${ethers.utils.formatEther(nativeBalance)}`
        );
      }

      // Check token balance
      const contract = new ethers.Contract(
        params.tokenAddress,
        ERC20_ABI,
        signer
      );
      const decimals = params.tokenDecimals || 18;
      const tokenBalance = await contract.balanceOf(address);
      const formattedAmount = this.formatAmountForParsing(params.amount, decimals);
      const requiredAmount = ethers.utils.parseUnits(formattedAmount, decimals);

      if (tokenBalance.lt(requiredAmount)) {
        throw new Error(
          `Insufficient token balance. ` +
          `Required: ${params.amount}, ` +
          `Available: ${ethers.utils.formatUnits(tokenBalance, decimals)}`
        );
      }
    }
  }

  /**
   * Wait for transaction confirmation
   */
  public async waitForTransaction(
    transactionHash: string,
    network: WalletNetwork,
    confirmations: number = 1
  ): Promise<ethers.providers.TransactionReceipt> {
    try {
      const provider = this.getProvider(network);
      return await provider.waitForTransaction(transactionHash, confirmations);
    } catch (error) {
      console.error("Error waiting for transaction:", error);
      throw new Error("Failed to wait for transaction confirmation");
    }
  }

  /**
   * Get transaction status
   */
  public async getTransactionStatus(
    transactionHash: string,
    network: WalletNetwork
  ): Promise<TransactionStatus> {
    try {
      const provider = this.getProvider(network);
      const tx = await provider.getTransaction(transactionHash);
      
      if (!tx) {
        throw new Error("Transaction not found");
      }

      const receipt = await provider.getTransactionReceipt(transactionHash);
      const currentBlock = await provider.getBlockNumber();

      if (!receipt) {
        return {
          hash: transactionHash,
          status: "pending",
          confirmations: 0,
        };
      }

      const confirmations = currentBlock - receipt.blockNumber + 1;
      const status = receipt.status === 1 ? "confirmed" : "failed";

      return {
        hash: transactionHash,
        status,
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
      };
    } catch (error) {
      console.error("Error getting transaction status:", error);
      throw new Error("Failed to get transaction status");
    }
  }

  /**
   * Cancel or speed up pending transaction (by replacing with higher gas)
   */
  public async replaceTransaction(
    originalTxHash: string,
    network: WalletNetwork,
    increaseGasBy: number = 20 // Percentage increase
  ): Promise<TransactionResult> {
    try {
      const provider = this.getProvider(network);
      const signer = await this.getSigner(network);
      
      const originalTx = await provider.getTransaction(originalTxHash);
      if (!originalTx) {
        throw new Error("Original transaction not found");
      }

      // Increase gas price
      const newGasPrice = originalTx.gasPrice
        ? originalTx.gasPrice.mul(100 + increaseGasBy).div(100)
        : undefined;

      const newMaxFeePerGas = originalTx.maxFeePerGas
        ? originalTx.maxFeePerGas.mul(100 + increaseGasBy).div(100)
        : undefined;

      const replacementTx: ethers.providers.TransactionRequest = {
        to: originalTx.to,
        value: originalTx.value,
        data: originalTx.data,
        nonce: originalTx.nonce,
        gasLimit: originalTx.gasLimit,
      };

      if (newMaxFeePerGas && originalTx.maxPriorityFeePerGas) {
        replacementTx.maxFeePerGas = newMaxFeePerGas;
        replacementTx.maxPriorityFeePerGas = originalTx.maxPriorityFeePerGas
          .mul(100 + increaseGasBy)
          .div(100);
      } else if (newGasPrice) {
        replacementTx.gasPrice = newGasPrice;
      }

      const txResponse = await signer.sendTransaction(replacementTx);

      const explorerUrl = network.explorerUrl
        ? `${network.explorerUrl}/tx/${txResponse.hash}`
        : undefined;

      return {
        hash: txResponse.hash,
        from: txResponse.from,
        to: txResponse.to || "",
        value: ethers.utils.formatEther(originalTx.value),
        status: "pending",
        timestamp: Date.now(),
        explorerUrl,
      };
    } catch (error: any) {
      console.error("Error replacing transaction:", error);
      throw new Error(error.message || "Failed to replace transaction");
    }
  }
}

export const transactionService = TransactionService.getInstance();

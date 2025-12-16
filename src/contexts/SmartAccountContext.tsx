import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ethers } from "ethers";
import { secureStorage } from "@/utils/secureStorage";
import { useWallet } from "@/contexts/WalletContext";
import {
  smartAccountService,
  SmartAccountInfo,
  SendTransactionParams,
  BatchTransactionParams,
} from "@/services/smartAccountService";
import {
  isSmartAccountEnabled,
  isNetworkSupported,
} from "@/config/smartAccount";
import { Address, Hash } from "viem";

const PRIVATE_KEY = "blockfinax.privateKey";

/**
 * Smart Account Context
 *
 * Provides ERC-4337 Account Abstraction features throughout the app:
 * - Gasless transactions
 * - Batch operations
 * - Programmable accounts
 *
 * Works with ALL login methods:
 * - Seed phrase generation
 * - Private key import
 * - Seed phrase import
 * - Google Sign-In
 * - Apple Sign-In
 */

interface SmartAccountContextType {
  // Smart Account Info
  smartAccount: SmartAccountInfo | null;
  isEnabled: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initializeSmartAccount: () => Promise<void>;
  sendTransaction: (params: SendTransactionParams) => Promise<Hash | null>;
  sendBatchTransactions: (
    params: BatchTransactionParams
  ) => Promise<Hash | null>;
  sendTokenTransfer: (
    tokenAddress: Address,
    recipientAddress: Address,
    amount: string,
    decimals?: number
  ) => Promise<Hash | null>;
  estimateGas: (params: SendTransactionParams) => Promise<any>;

  // Utility
  reset: () => void;
}

const SmartAccountContext = createContext<SmartAccountContextType | undefined>(
  undefined
);

export function SmartAccountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { address, selectedNetwork, isUnlocked } = useWallet();
  const [smartAccount, setSmartAccount] = useState<SmartAccountInfo | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if smart accounts are enabled
  const isEnabled =
    isSmartAccountEnabled() && isNetworkSupported(selectedNetwork.id);

  /**
   * Initialize smart account when wallet is available
   */
  const initializeSmartAccount = useCallback(async () => {
    if (!address || !isUnlocked || !isEnabled) {
      console.log("Smart account initialization skipped:", {
        hasAddress: !!address,
        isUnlocked,
        isEnabled,
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("🚀 Initializing smart account for:", address);

      // Get private key from secure storage
      const privateKey = await secureStorage.getItem(PRIVATE_KEY);
      if (!privateKey) {
        console.error("Private key not found in secure storage");
        setIsInitialized(false);
        return;
      }

      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey);

      const accountInfo = await smartAccountService.initializeSmartAccount(
        wallet,
        selectedNetwork
      );

      if (accountInfo) {
        setSmartAccount(accountInfo);
        setIsInitialized(true);
        console.log("✅ Smart account ready:", accountInfo.address);
      } else {
        console.warn("Failed to initialize smart account");
        setIsInitialized(false);
      }
    } catch (error) {
      console.error("Error initializing smart account:", error);
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  }, [address, selectedNetwork, isEnabled, isUnlocked]);

  /**
   * Auto-initialize when wallet becomes available
   */
  useEffect(() => {
    if (address && isUnlocked && isEnabled && !isInitialized) {
      initializeSmartAccount();
    }
  }, [address, isUnlocked, isEnabled, isInitialized, initializeSmartAccount]);

  /**
   * Re-initialize when network changes
   */
  useEffect(() => {
    if (isInitialized && address && isUnlocked && isEnabled) {
      console.log("Network changed, re-initializing smart account");
      initializeSmartAccount();
    }
  }, [selectedNetwork.id]);

  /**
   * Send a single transaction
   */
  const sendTransaction = useCallback(
    async (params: SendTransactionParams): Promise<Hash | null> => {
      if (!isInitialized) {
        throw new Error("Smart account not initialized");
      }

      try {
        const txHash = await smartAccountService.sendTransaction(params);
        return txHash;
      } catch (error) {
        console.error("Transaction failed:", error);
        throw error;
      }
    },
    [isInitialized]
  );

  /**
   * Send batch transactions
   */
  const sendBatchTransactions = useCallback(
    async (params: BatchTransactionParams): Promise<Hash | null> => {
      if (!isInitialized) {
        throw new Error("Smart account not initialized");
      }

      try {
        const txHash = await smartAccountService.sendBatchTransactions(params);
        return txHash;
      } catch (error) {
        console.error("Batch transaction failed:", error);
        throw error;
      }
    },
    [isInitialized]
  );

  /**
   * Send token transfer
   */
  const sendTokenTransfer = useCallback(
    async (
      tokenAddress: Address,
      recipientAddress: Address,
      amount: string,
      decimals: number = 18
    ): Promise<Hash | null> => {
      if (!isInitialized) {
        throw new Error("Smart account not initialized");
      }

      try {
        const txHash = await smartAccountService.sendTokenTransfer(
          tokenAddress,
          recipientAddress,
          amount,
          decimals
        );
        return txHash;
      } catch (error) {
        console.error("Token transfer failed:", error);
        throw error;
      }
    },
    [isInitialized]
  );

  /**
   * Estimate gas for transaction
   */
  const estimateGas = useCallback(
    async (params: SendTransactionParams) => {
      if (!isInitialized) {
        throw new Error("Smart account not initialized");
      }

      try {
        const estimate = await smartAccountService.estimateUserOperationGas(
          params
        );
        return estimate;
      } catch (error) {
        console.error("Gas estimation failed:", error);
        throw error;
      }
    },
    [isInitialized]
  );

  /**
   * Reset smart account state
   */
  const reset = useCallback(() => {
    smartAccountService.reset();
    setSmartAccount(null);
    setIsInitialized(false);
  }, []);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!address || !isUnlocked) {
      reset();
    }
  }, [address, isUnlocked, reset]);

  const value: SmartAccountContextType = {
    smartAccount,
    isEnabled,
    isLoading,
    isInitialized,
    initializeSmartAccount,
    sendTransaction,
    sendBatchTransactions,
    sendTokenTransfer,
    estimateGas,
    reset,
  };

  return (
    <SmartAccountContext.Provider value={value}>
      {children}
    </SmartAccountContext.Provider>
  );
}

/**
 * Hook to use Smart Account context
 */
export function useSmartAccount() {
  const context = useContext(SmartAccountContext);
  if (context === undefined) {
    throw new Error("useSmartAccount must be used within SmartAccountProvider");
  }
  return context;
}

/**
 * Hook to check if user should use smart account for transaction
 */
export function useShouldUseSmartAccount(): boolean {
  const { isEnabled, isInitialized } = useSmartAccount();
  return isEnabled && isInitialized;
}

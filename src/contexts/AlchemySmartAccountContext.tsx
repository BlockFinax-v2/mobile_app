/**
 * Alchemy Smart Account Context
 * 
 * This context provides Alchemy Account Abstraction (ERC-4337) functionality
 * using the Alchemy Account Kit SDK. It works alongside the existing Pimlico
 * SmartAccountContext for a gradual migration.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { type Hex } from 'viem';
import { AlchemyAccountService, type TransactionCall, type UserOperationResult } from '../services/alchemyAccountService';
import { useWallet } from './WalletContext';
import { secureStorage } from '../utils/secureStorage';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { isAlchemyNetworkSupported } from '../config/alchemyAccount';

const PRIVATE_KEY = 'blockfinax.privateKey';

interface AlchemySmartAccountContextType {
  // Account state
  alchemyAccountAddress: string | null;
  isAlchemyInitialized: boolean;
  isAlchemyDeployed: boolean;
  
  // Account actions
  initializeAlchemyAccount: () => Promise<void>;
  disconnectAlchemyAccount: () => void;
  
  // Transaction actions
  sendAlchemyTransaction: (call: TransactionCall) => Promise<UserOperationResult>;
  sendAlchemyBatchTransactions: (calls: TransactionCall[]) => Promise<UserOperationResult>;
  sendAlchemyNativeToken: (to: Hex, amount: bigint) => Promise<UserOperationResult>;
  sendAlchemyERC20Token: (tokenAddress: Hex, to: Hex, amount: bigint) => Promise<UserOperationResult>;
  executeAlchemyContractFunction: (
    contractAddress: Hex,
    abi: any[],
    functionName: string,
    args: any[],
    value?: bigint
  ) => Promise<UserOperationResult>;
  
  // Loading states
  isInitializing: boolean;
  isSendingTransaction: boolean;
  
  // Error state
  error: string | null;
}

const AlchemySmartAccountContext = createContext<AlchemySmartAccountContextType | undefined>(undefined);

export const AlchemySmartAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedNetwork, isUnlocked, setSmartAccountInfo, clearSmartAccountInfo } = useWallet();
  
  const [accountService, setAccountService] = useState<AlchemyAccountService | null>(null);
  const [alchemyAccountAddress, setAlchemyAccountAddress] = useState<string | null>(null);
  const [isAlchemyInitialized, setIsAlchemyInitialized] = useState(false);
  const [isAlchemyDeployed, setIsAlchemyDeployed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize Alchemy smart account
   */
  const initializeAlchemyAccount = useCallback(async () => {
    if (!isUnlocked) {
      setError('Wallet is locked');
      return;
    }

    if (!selectedNetwork) {
      setError('No network selected');
      return;
    }

    // Check if AA is enabled via feature flag
    if (!FEATURE_FLAGS.USE_ALCHEMY_AA) {
      console.log('[AlchemyContext] Alchemy AA is disabled via feature flag');
      return;
    }

    // Check if network is supported
    if (!isAlchemyNetworkSupported(selectedNetwork.id)) {
      console.log('[AlchemyContext] Network not supported:', selectedNetwork.id);
      setError(`Network ${selectedNetwork.name} is not supported by Alchemy AA`);
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      // Get private key from secure storage
      const privateKey = await secureStorage.getItem(PRIVATE_KEY);
      if (!privateKey) {
        throw new Error('No private key found in secure storage');
      }

      console.log('[AlchemyContext] Initializing Alchemy account on network:', selectedNetwork.id);

      // Create service instance with network ID as string
      const service = new AlchemyAccountService(selectedNetwork.id);

      // Initialize the account
      const address = await service.initializeSmartAccount(privateKey);

      // Check if deployed
      const deployed = await service.isAccountDeployed();

      setAccountService(service);
      setAlchemyAccountAddress(address);
      setIsAlchemyDeployed(deployed);
      setIsAlchemyInitialized(true);

      // Update WalletContext with smart account info
      setSmartAccountInfo(address, deployed);

      console.log('[AlchemyContext] Alchemy account initialized:', address);
      console.log('[AlchemyContext] Account deployed:', deployed);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Alchemy account';
      console.error('[AlchemyContext] Initialization error:', err);
      setError(errorMessage);
      setIsAlchemyInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  }, [isUnlocked, selectedNetwork]);

  /**
   * Disconnect Alchemy account
   */
  const disconnectAlchemyAccount = useCallback(() => {
    if (accountService) {
      accountService.disconnect();
    }
    setAccountService(null);
    setAlchemyAccountAddress(null);
    setIsAlchemyInitialized(false);
    setIsAlchemyDeployed(false);
    setError(null);
    
    // Clear smart account info from WalletContext
    clearSmartAccountInfo();
  }, [accountService, clearSmartAccountInfo]);

  /**
   * Send a single transaction
   */
  const sendAlchemyTransaction = useCallback(async (call: TransactionCall): Promise<UserOperationResult> => {
    if (!accountService) {
      throw new Error('Alchemy account not initialized');
    }

    try {
      setIsSendingTransaction(true);
      setError(null);

      const result = await accountService.sendUserOperation(call);

      // Update deployment status after first transaction
      if (!isAlchemyDeployed) {
        const deployed = await accountService.isAccountDeployed();
        setIsAlchemyDeployed(deployed);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      console.error('[AlchemyContext] Transaction error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsSendingTransaction(false);
    }
  }, [accountService, isAlchemyDeployed]);

  /**
   * Send a batch of transactions
   */
  const sendAlchemyBatchTransactions = useCallback(async (calls: TransactionCall[]): Promise<UserOperationResult> => {
    if (!accountService) {
      throw new Error('Alchemy account not initialized');
    }

    try {
      setIsSendingTransaction(true);
      setError(null);

      const result = await accountService.sendBatchUserOperation(calls);

      // Update deployment status after first batch
      if (!isAlchemyDeployed) {
        const deployed = await accountService.isAccountDeployed();
        setIsAlchemyDeployed(deployed);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send batch transactions';
      console.error('[AlchemyContext] Batch transaction error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsSendingTransaction(false);
    }
  }, [accountService, isAlchemyDeployed]);

  /**
   * Send native token
   */
  const sendAlchemyNativeToken = useCallback(async (to: Hex, amount: bigint): Promise<UserOperationResult> => {
    if (!accountService) {
      throw new Error('Alchemy account not initialized');
    }

    try {
      setIsSendingTransaction(true);
      setError(null);

      const result = await accountService.sendNativeToken(to, amount);

      if (!isAlchemyDeployed) {
        const deployed = await accountService.isAccountDeployed();
        setIsAlchemyDeployed(deployed);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send native token';
      console.error('[AlchemyContext] Native token transfer error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsSendingTransaction(false);
    }
  }, [accountService, isAlchemyDeployed]);

  /**
   * Send ERC-20 token
   */
  const sendAlchemyERC20Token = useCallback(async (
    tokenAddress: Hex,
    to: Hex,
    amount: bigint
  ): Promise<UserOperationResult> => {
    if (!accountService) {
      throw new Error('Alchemy account not initialized');
    }

    try {
      setIsSendingTransaction(true);
      setError(null);

      const result = await accountService.sendERC20Token(tokenAddress, to, amount);

      if (!isAlchemyDeployed) {
        const deployed = await accountService.isAccountDeployed();
        setIsAlchemyDeployed(deployed);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send ERC-20 token';
      console.error('[AlchemyContext] ERC-20 transfer error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsSendingTransaction(false);
    }
  }, [accountService, isAlchemyDeployed]);

  /**
   * Execute contract function
   */
  const executeAlchemyContractFunction = useCallback(async (
    contractAddress: Hex,
    abi: any[],
    functionName: string,
    args: any[],
    value?: bigint
  ): Promise<UserOperationResult> => {
    if (!accountService) {
      throw new Error('Alchemy account not initialized');
    }

    try {
      setIsSendingTransaction(true);
      setError(null);

      const result = await accountService.executeContractFunction(
        contractAddress,
        abi,
        functionName,
        args,
        { value }
      );

      if (!isAlchemyDeployed) {
        const deployed = await accountService.isAccountDeployed();
        setIsAlchemyDeployed(deployed);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute contract function';
      console.error('[AlchemyContext] Contract execution error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsSendingTransaction(false);
    }
  }, [accountService, isAlchemyDeployed]);

  /**
   * Auto-initialize smart account when wallet is unlocked
   */
  useEffect(() => {
    if (isUnlocked && !isAlchemyInitialized && !isInitializing && FEATURE_FLAGS.USE_ALCHEMY_AA) {
      const networkSupported = isAlchemyNetworkSupported(selectedNetwork.id);
      
      if (networkSupported) {
        console.log('[AlchemyContext] Auto-initializing smart account on wallet unlock');
        initializeAlchemyAccount().catch((error) => {
          console.error('[AlchemyContext] Auto-initialization failed:', error);
        });
      } else {
        console.log('[AlchemyContext] Skipping auto-init - network not supported:', selectedNetwork.id);
      }
    }
  }, [isUnlocked, isAlchemyInitialized, isInitializing, selectedNetwork.id, initializeAlchemyAccount]);

  /**
   * Disconnect and clear when wallet is locked
   */
  useEffect(() => {
    if (!isUnlocked && isAlchemyInitialized) {
      console.log('[AlchemyContext] Wallet locked - disconnecting smart account');
      disconnectAlchemyAccount();
    }
  }, [isUnlocked, isAlchemyInitialized, disconnectAlchemyAccount]);

  /**
   * Re-initialize when network changes (if unlocked)
   */
  useEffect(() => {
    if (isUnlocked && isAlchemyInitialized && FEATURE_FLAGS.USE_ALCHEMY_AA) {
      const networkSupported = isAlchemyNetworkSupported(selectedNetwork.id);
      
      if (networkSupported) {
        console.log('[AlchemyContext] Network changed - re-initializing smart account');
        initializeAlchemyAccount().catch((error) => {
          console.error('[AlchemyContext] Re-initialization failed:', error);
        });
      } else {
        console.log('[AlchemyContext] Network not supported - disconnecting:', selectedNetwork.id);
        disconnectAlchemyAccount();
      }
    }
  }, [selectedNetwork.id, isUnlocked, isAlchemyInitialized, initializeAlchemyAccount, disconnectAlchemyAccount]);

  /**
   * Clean up on unmount or when dependencies change
   */
  useEffect(() => {
    return () => {
      if (accountService) {
        accountService.disconnect();
      }
    };
  }, [accountService]);

  const value: AlchemySmartAccountContextType = {
    // Account state
    alchemyAccountAddress,
    isAlchemyInitialized,
    isAlchemyDeployed,
    
    // Account actions
    initializeAlchemyAccount,
    disconnectAlchemyAccount,
    
    // Transaction actions
    sendAlchemyTransaction,
    sendAlchemyBatchTransactions,
    sendAlchemyNativeToken,
    sendAlchemyERC20Token,
    executeAlchemyContractFunction,
    
    // Loading states
    isInitializing,
    isSendingTransaction,
    
    // Error state
    error,
  };

  return (
    <AlchemySmartAccountContext.Provider value={value}>
      {children}
    </AlchemySmartAccountContext.Provider>
  );
};

/**
 * Hook to use the Alchemy Smart Account Context
 */
export const useAlchemySmartAccount = (): AlchemySmartAccountContextType => {
  const context = useContext(AlchemySmartAccountContext);
  if (!context) {
    throw new Error('useAlchemySmartAccount must be used within AlchemySmartAccountProvider');
  }
  return context;
};

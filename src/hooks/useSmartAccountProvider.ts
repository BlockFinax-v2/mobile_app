/**
 * Unified Smart Account Provider Hook
 * 
 * This hook provides a unified interface that automatically switches between
 * Pimlico and Alchemy implementations based on feature flags.
 * 
 * Use this hook instead of directly using useSmartAccount or useAlchemySmartAccount
 * to enable seamless migration.
 */

import { useSmartAccount } from '@/contexts/SmartAccountContext';
import { useAlchemySmartAccount } from '@/contexts/AlchemySmartAccountContext';
import { shouldUseAlchemyForScreen } from '@/config/featureFlags';
import { type Hex } from 'viem';
import type { TransactionCall, UserOperationResult } from '@/services/alchemyAccountService';
import type { SendTransactionParams, BatchTransactionParams } from '@/services/smartAccountService';

export interface UnifiedSmartAccountContext {
  // Account state
  smartAccountAddress: string | null;
  isInitialized: boolean;
  isDeployed: boolean;
  
  // Account actions
  initializeSmartAccount: () => Promise<void>;
  disconnectSmartAccount: () => void;
  
  // Transaction actions
  sendTransaction: (call: any) => Promise<any>;
  sendBatchTransactions: (calls: any) => Promise<any>;
  sendNativeToken: (to: Hex, amount: bigint) => Promise<any>;
  sendERC20Token: (tokenAddress: Hex, to: Hex, amount: bigint) => Promise<any>;
  executeContractFunction: (
    contractAddress: Hex,
    abi: any[],
    functionName: string,
    args: any[],
    value?: bigint
  ) => Promise<any>;
  
  // Loading states
  isInitializing: boolean;
  isSendingTransaction: boolean;
  
  // Error state
  error: string | null;
  
  // Metadata
  provider: 'pimlico' | 'alchemy';
}

/**
 * Main unified hook that switches between Pimlico and Alchemy based on feature flags
 * 
 * @param screenName - Optional screen name for screen-specific rollout
 * @returns Unified smart account context
 */
export function useSmartAccountProvider(screenName?: string): UnifiedSmartAccountContext {
  const pimlicoAccount = useSmartAccount();
  const alchemyAccount = useAlchemySmartAccount();
  const shouldUseAlchemy = shouldUseAlchemyForScreen(screenName);
  
  // If using Alchemy, map Alchemy account to unified interface
  if (shouldUseAlchemy) {
    return {
      // Map Alchemy state to unified interface
      smartAccountAddress: alchemyAccount.alchemyAccountAddress,
      isInitialized: alchemyAccount.isAlchemyInitialized,
      isDeployed: alchemyAccount.isAlchemyDeployed,
      
      // Map Alchemy actions
      initializeSmartAccount: alchemyAccount.initializeAlchemyAccount,
      disconnectSmartAccount: alchemyAccount.disconnectAlchemyAccount,
      
      // Map transaction methods
      sendTransaction: alchemyAccount.sendAlchemyTransaction,
      sendBatchTransactions: alchemyAccount.sendAlchemyBatchTransactions,
      sendNativeToken: alchemyAccount.sendAlchemyNativeToken,
      sendERC20Token: alchemyAccount.sendAlchemyERC20Token,
      executeContractFunction: alchemyAccount.executeAlchemyContractFunction,
      
      // Map loading states
      isInitializing: alchemyAccount.isInitializing,
      isSendingTransaction: alchemyAccount.isSendingTransaction,
      
      // Map error
      error: alchemyAccount.error,
      
      // Provider metadata
      provider: 'alchemy',
    };
  } else {
    // Use Pimlico implementation
    return {
      // Map Pimlico state to unified interface
      smartAccountAddress: pimlicoAccount.smartAccount?.address || null,
      isInitialized: pimlicoAccount.isInitialized,
      isDeployed: pimlicoAccount.smartAccount?.isDeployed || false,
      
      // Map Pimlico actions
      initializeSmartAccount: pimlicoAccount.initializeSmartAccount,
      disconnectSmartAccount: pimlicoAccount.reset,
      
      // Map transaction methods
      sendTransaction: pimlicoAccount.sendTransaction,
      sendBatchTransactions: pimlicoAccount.sendBatchTransactions,
      sendNativeToken: async (to: Hex, amount: bigint) => {
        // Pimlico sendTransaction expects different params
        return pimlicoAccount.sendTransaction({
          to,
          value: amount.toString(),
          data: '0x' as Hex,
        } as SendTransactionParams);
      },
      sendERC20Token: (tokenAddress: Hex, to: Hex, amount: bigint) => {
        // Convert bigint to string for Pimlico
        return pimlicoAccount.sendTokenTransfer(tokenAddress, to, amount.toString());
      },
      executeContractFunction: async (
        contractAddress: Hex,
        abi: any[],
        functionName: string,
        args: any[],
        value?: bigint
      ) => {
        // Pimlico doesn't have direct contract execution
        // Would need manual encoding - not implemented for now
        console.warn('executeContractFunction not implemented for Pimlico');
        return null;
      },
      
      // Map loading states
      isInitializing: pimlicoAccount.isLoading,
      isSendingTransaction: pimlicoAccount.isLoading,
      
      // Map error - Pimlico doesn't expose error state
      error: null,
      
      // Provider metadata
      provider: 'pimlico',
    };
  }
}

/**
 * Hook to check which provider is currently active
 * 
 * @param screenName - Optional screen name
 * @returns 'pimlico' | 'alchemy'
 */
export function useActiveProvider(screenName?: string): 'pimlico' | 'alchemy' {
  return shouldUseAlchemyForScreen(screenName) ? 'alchemy' : 'pimlico';
}

/**
 * Advanced hook to access both providers directly (for testing/debugging)
 * 
 * @returns Both Pimlico and Alchemy contexts
 */
export function useSmartAccountProviders() {
  const pimlico = useSmartAccount();
  const alchemy = useAlchemySmartAccount();
  
  return {
    pimlico,
    alchemy,
  };
}

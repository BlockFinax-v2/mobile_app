/**
 * Performance-optimized navigation utilities
 * Provides instant navigation feedback with deferred heavy operations
 */

import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { performanceMonitor } from '@/utils/performanceMonitor';

/**
 * Hook for instant navigation with deferred heavy operations
 */
export function useInstantNavigation() {
  const navigation = useNavigation<any>();

  const navigateInstant = useCallback(
    (screen: string, params?: any, heavyOperation?: () => Promise<void> | void) => {
      const opId = performanceMonitor.startOperation('instant_navigation');
      
      // Immediate navigation
      navigation.navigate(screen, params);
      performanceMonitor.endOperation(opId, true);

      // Defer heavy operations until after navigation completes
      if (heavyOperation) {
        InteractionManager.runAfterInteractions(async () => {
          const heavyOpId = performanceMonitor.startOperation('post_navigation_heavy_op');
          try {
            const result = heavyOperation();
            if (result instanceof Promise) {
              await result;
            }
            performanceMonitor.endOperation(heavyOpId, true);
          } catch (error) {
            console.error('Post-navigation heavy operation failed:', error);
            performanceMonitor.endOperation(heavyOpId, false, error instanceof Error ? error.message : String(error));
          }
        });
      }
    },
    [navigation]
  );

  const navigateReset = useCallback(
    (routeName: string, params?: any) => {
      navigation.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      });
    },
    [navigation]
  );

  const goBackInstant = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return {
    navigateInstant,
    navigateReset,
    goBackInstant,
    navigation,
  };
}

/**
 * Optimized wallet operation wrapper
 * Provides instant UI feedback with background wallet operations
 */
export function useWalletOperations() {
  const performWalletOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      operationName: string,
      onStart?: () => void,
      onComplete?: (result: T) => void,
      onError?: (error: Error) => void
    ): Promise<void> => {
      const opId = performanceMonitor.startOperation(`wallet_${operationName}`);
      
      try {
        // Immediate UI feedback
        if (onStart) {
          onStart();
        }

        // Defer heavy wallet operation
        InteractionManager.runAfterInteractions(async () => {
          try {
            const result = await operation();
            performanceMonitor.endOperation(opId, true);
            
            if (onComplete) {
              onComplete(result);
            }
          } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            console.error(`Wallet operation ${operationName} failed:`, errorObj);
            performanceMonitor.endOperation(opId, false, errorObj.message);
            
            if (onError) {
              onError(errorObj);
            }
          }
        });
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        performanceMonitor.endOperation(opId, false, errorObj.message);
        
        if (onError) {
          onError(errorObj);
        }
      }
    },
    []
  );

  return {
    performWalletOperation,
  };
}

/**
 * Performance-optimized state updates
 * Batches state updates and defers heavy computations
 */
export function useDeferredUpdates() {
  const deferHeavyUpdate = useCallback(
    (heavyUpdate: () => void | Promise<void>, delay: number = 100) => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(async () => {
          const opId = performanceMonitor.startOperation('deferred_update');
          try {
            const result = heavyUpdate();
            if (result instanceof Promise) {
              await result;
            }
            performanceMonitor.endOperation(opId, true);
          } catch (error) {
            console.error('Deferred update failed:', error);
            performanceMonitor.endOperation(opId, false, error instanceof Error ? error.message : String(error));
          }
        }, delay);
      });
    },
    []
  );

  const batchUpdates = useCallback(
    (updates: (() => void)[]) => {
      requestAnimationFrame(() => {
        updates.forEach((update) => {
          try {
            update();
          } catch (error) {
            console.error('Batch update failed:', error);
          }
        });
      });
    },
    []
  );

  return {
    deferHeavyUpdate,
    batchUpdates,
  };
}
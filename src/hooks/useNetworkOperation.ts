import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';

/**
 * Network operations hook
 * Common patterns for API calls, loading states, and error handling
 */
export function useNetworkOperation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const showToast = useCallback((message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Notification', message);
    }
  }, []);

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      showSuccessToast?: boolean;
      successMessage?: string;
      showErrorAlert?: boolean;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await operation();

      if (!mounted.current) return null;

      if (options.showSuccessToast && options.successMessage) {
        showToast(options.successMessage);
      }

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (err) {
      if (!mounted.current) return null;

      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error.message);

      if (options.showErrorAlert) {
        Alert.alert('Error', error.message);
      }

      if (options.onError) {
        options.onError(error);
      }

      console.error('Network operation failed:', error);
      return null;
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, [showToast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    execute,
    clearError,
    showToast,
  };
}

/**
 * Async state hook for handling async operations with loading/error states
 */
export function useAsyncState<T>(initialValue?: T) {
  const [data, setData] = useState<T | undefined>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(initialValue);
    setError(null);
    setIsLoading(false);
  }, [initialValue]);

  return {
    data,
    isLoading,
    error,
    execute,
    setData,
    reset,
  };
}

/**
 * Debounced value hook
 * Useful for search inputs and API calls
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Retry mechanism hook
 */
export function useRetry() {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = 3,
    delay: number = 1000
  ) => {
    setIsRetrying(true);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await operation();
        setRetryCount(0);
        setIsRetrying(false);
        return result;
      } catch (error) {
        setRetryCount(i + 1);
        
        if (i === maxRetries - 1) {
          setIsRetrying(false);
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, []);

  return {
    retry,
    retryCount,
    isRetrying,
  };
}
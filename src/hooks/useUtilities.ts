import { useState, useCallback, useEffect } from 'react';

/**
 * Toast/notification management hook
 */
export interface ToastConfig {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function useToast() {
  const [toast, setToast] = useState<ToastConfig | null>(null);

  const showToast = useCallback((config: ToastConfig | string) => {
    const toastConfig = typeof config === 'string' 
      ? { message: config, type: 'info' as const, duration: 3000 }
      : { duration: 3000, type: 'info' as const, ...config };
    
    setToast(toastConfig);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'success', duration });
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'error', duration });
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'warning', duration });
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'info', duration });
  }, [showToast]);

  // Auto hide toast
  useEffect(() => {
    if (toast?.duration) {
      const timer = setTimeout(() => {
        hideToast();
      }, toast.duration);
      
      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

/**
 * Boolean state toggle hook
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    setValue,
  };
}

/**
 * Local storage hook (AsyncStorage for React Native)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAsyncStorage<T>(key: string, initialValue?: T) {
  const [value, setValue] = useState<T | undefined>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load value on mount
  useEffect(() => {
    const loadValue = async () => {
      try {
        setIsLoading(true);
        const stored = await AsyncStorage.getItem(key);
        if (stored !== null) {
          setValue(JSON.parse(stored));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [key]);

  // Save value
  const updateValue = useCallback(async (newValue: T) => {
    try {
      setValue(newValue);
      await AsyncStorage.setItem(key, JSON.stringify(newValue));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
    }
  }, [key]);

  // Remove value
  const removeValue = useCallback(async () => {
    try {
      setValue(initialValue);
      await AsyncStorage.removeItem(key);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove data');
    }
  }, [key, initialValue]);

  return {
    value,
    updateValue,
    removeValue,
    isLoading,
    error,
  };
}

/**
 * Counter hook with increment/decrement and limits
 */
export function useCounter(initialValue = 0, options: {
  min?: number;
  max?: number;
  step?: number;
} = {}) {
  const { min, max, step = 1 } = options;
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount(prev => {
      const newValue = prev + step;
      return max !== undefined ? Math.min(newValue, max) : newValue;
    });
  }, [step, max]);

  const decrement = useCallback(() => {
    setCount(prev => {
      const newValue = prev - step;
      return min !== undefined ? Math.max(newValue, min) : newValue;
    });
  }, [step, min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const set = useCallback((value: number) => {
    let newValue = value;
    if (min !== undefined) newValue = Math.max(newValue, min);
    if (max !== undefined) newValue = Math.min(newValue, max);
    setCount(newValue);
  }, [min, max]);

  return {
    count,
    increment,
    decrement,
    reset,
    set,
    canIncrement: max === undefined || count < max,
    canDecrement: min === undefined || count > min,
  };
}

/**
 * Previous value hook
 */
export function usePrevious<T>(value: T): T | undefined {
  const [current, setCurrent] = useState<T>(value);
  const [previous, setPrevious] = useState<T | undefined>(undefined);

  if (value !== current) {
    setPrevious(current);
    setCurrent(value);
  }

  return previous;
}

/**
 * Clipboard hook
 */
import { Clipboard } from 'react-native';

export function useClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await Clipboard.setString(text);
      setCopiedText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  const getFromClipboard = useCallback(async (): Promise<string> => {
    try {
      const text = await Clipboard.getString();
      return text;
    } catch (error) {
      console.error('Failed to get from clipboard:', error);
      return '';
    }
  }, []);

  return {
    copiedText,
    copyToClipboard,
    getFromClipboard,
  };
}
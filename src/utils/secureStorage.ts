import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export interface BiometricOptions {
  promptMessage?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}

export interface StorageOptions {
  requireBiometric?: boolean;
  biometricOptions?: BiometricOptions;
}

class SecureStorageManager {
  private static instance: SecureStorageManager;
  
  public static getInstance(): SecureStorageManager {
    if (!SecureStorageManager.instance) {
      SecureStorageManager.instance = new SecureStorageManager();
    }
    return SecureStorageManager.instance;
  }

  /**
   * Check if biometric authentication is available and enrolled
   */
  public async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.warn('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get supported biometric types
   */
  public async getSupportedBiometrics(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.warn('Error getting supported biometrics:', error);
      return [];
    }
  }

  /**
   * Authenticate user with biometrics
   */
  public async authenticateWithBiometrics(options?: BiometricOptions): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options?.promptMessage || 'Authenticate to access your wallet',
        fallbackLabel: options?.fallbackLabel || 'Use Passcode',
        disableDeviceFallback: options?.disableDeviceFallback || false,
      });
      
      return result.success;
    } catch (error) {
      console.warn('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Store sensitive data securely
   */
  public async setSecureItem(
    key: string, 
    value: string, 
    options?: StorageOptions
  ): Promise<void> {
    try {
      // If biometric is required and available, authenticate first
      if (options?.requireBiometric && await this.isBiometricAvailable()) {
        const authenticated = await this.authenticateWithBiometrics(options.biometricOptions);
        if (!authenticated) {
          throw new Error('Biometric authentication failed');
        }
      }

      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      console.error('Error storing secure item:', error);
      throw error;
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  public async getSecureItem(
    key: string, 
    options?: StorageOptions
  ): Promise<string | null> {
    try {
      // If biometric is required and available, authenticate first
      if (options?.requireBiometric && await this.isBiometricAvailable()) {
        const authenticated = await this.authenticateWithBiometrics(options.biometricOptions);
        if (!authenticated) {
          throw new Error('Biometric authentication failed');
        }
      }

      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error retrieving secure item:', error);
      throw error;
    }
  }

  /**
   * Delete secure item
   */
  public async deleteSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error deleting secure item:', error);
      throw error;
    }
  }

  /**
   * Store non-sensitive data
   */
  public async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error storing item:', error);
      throw error;
    }
  }

  /**
   * Retrieve non-sensitive data
   */
  public async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error retrieving item:', error);
      return null;
    }
  }

  /**
   * Delete non-sensitive data
   */
  public async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  }

  /**
   * Clear all wallet data (both secure and non-secure)
   */
  public async clearWalletData(): Promise<void> {
    try {
      // Keys for secure storage
      const secureKeys = [
        'blockfinax.mnemonic',
        'blockfinax.privateKey',
        'blockfinax.password',
        'blockfinax.biometric_hash',
      ];

      // Keys for async storage
      const asyncKeys = [
        'blockfinax.settings',
        'blockfinax.network',
        'blockfinax.lastUnlock',
        'blockfinax.wallet_persistent',
        'blockfinax.biometric_enabled',
      ];

      // Clear secure storage
      await Promise.all(
        secureKeys.map(key => this.deleteSecureItem(key).catch(() => {}))
      );

      // Clear async storage
      await Promise.all(
        asyncKeys.map(key => this.removeItem(key).catch(() => {}))
      );
    } catch (error) {
      console.error('Error clearing wallet data:', error);
      throw error;
    }
  }
}

export const secureStorage = SecureStorageManager.getInstance();
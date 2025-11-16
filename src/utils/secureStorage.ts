import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

class SecureStorageManager {
  private static instance: SecureStorageManager;
  
  public static getInstance(): SecureStorageManager {
    if (!SecureStorageManager.instance) {
      SecureStorageManager.instance = new SecureStorageManager();
    }
    return SecureStorageManager.instance;
  }



  /**
   * Store sensitive data securely
   */
  public async setSecureItem(key: string, value: string): Promise<void> {
    try {
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
  public async getSecureItem(key: string): Promise<string | null> {
    try {
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
      ];

      // Keys for async storage
      const asyncKeys = [
        'blockfinax.settings',
        'blockfinax.network',
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
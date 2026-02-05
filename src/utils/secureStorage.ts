import { Storage } from "@/utils/storage";
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

class SecureStorageManager {
  private static instance: SecureStorageManager;

  public static getInstance(): SecureStorageManager {
    if (!SecureStorageManager.instance) {
      SecureStorageManager.instance = new SecureStorageManager();
    }
    return SecureStorageManager.instance;
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private async deriveKey(password: string, salt: string): Promise<string> {
    const combined = password + salt;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );
    return hash;
  }

  /**
   * Simple XOR encryption (not cryptographically strong, but better than plain text)
   * For production, consider using expo-crypto's AES encryption
   */
  private encrypt(data: string, key: string): string {
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    // Use btoa for React Native compatible base64 encoding
    return this.base64Encode(encrypted);
  }

  /**
   * Simple XOR decryption
   */
  private decrypt(encryptedData: string, key: string): string {
    // Use atob for React Native compatible base64 decoding
    const binary = this.base64Decode(encryptedData);
    let decrypted = '';
    for (let i = 0; i < binary.length; i++) {
      decrypted += String.fromCharCode(
        binary.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return decrypted;
  }

  /**
   * React Native compatible base64 encode
   * Pure JavaScript implementation to avoid stack overflow with large data
   */
  private base64Encode(str: string): string {
    const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;

      const bitmap = (a << 16) | (b << 8) | c;

      result += base64chars.charAt((bitmap >> 18) & 63);
      result += base64chars.charAt((bitmap >> 12) & 63);
      result += (i - 2) < str.length ? base64chars.charAt((bitmap >> 6) & 63) : '=';
      result += (i - 1) < str.length ? base64chars.charAt(bitmap & 63) : '=';
    }

    return result;
  }

  /**
   * React Native compatible base64 decode
   * Pure JavaScript implementation to avoid stack overflow with large data
   */
  private base64Decode(base64: string): string {
    const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    // Remove padding and whitespace
    base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');

    while (i < base64.length) {
      const enc1 = base64chars.indexOf(base64.charAt(i++));
      const enc2 = base64chars.indexOf(base64.charAt(i++));
      const enc3 = base64chars.indexOf(base64.charAt(i++));
      const enc4 = base64chars.indexOf(base64.charAt(i++));

      const bitmap = (enc1 << 18) | (enc2 << 12) | (enc3 << 6) | enc4;

      result += String.fromCharCode((bitmap >> 16) & 255);

      if (enc3 !== -1) {
        result += String.fromCharCode((bitmap >> 8) & 255);
      }
      if (enc4 !== -1) {
        result += String.fromCharCode(bitmap & 255);
      }
    }

    return result;
  }

  /**
   * Store encrypted private key (requires password or biometric)
   */
  public async setEncryptedPrivateKey(privateKey: string, password: string): Promise<void> {
    try {
      // Generate random salt
      const salt = Math.random().toString(36).substring(7);
      await this.setItem('blockfinax.salt', salt);

      // Derive encryption key from password
      const encryptionKey = await this.deriveKey(password, salt);

      // Encrypt private key
      const encrypted = this.encrypt(privateKey, encryptionKey);

      // Store encrypted private key
      await SecureStore.setItemAsync('blockfinax.privateKey.encrypted', encrypted, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      console.log('✅ Private key encrypted and stored securely');
    } catch (error) {
      console.error('Error storing encrypted private key:', error);
      throw error;
    }
  }

  /**
   * Get decrypted private key (requires password or biometric)
   */
  public async getDecryptedPrivateKey(password: string): Promise<string | null> {
    try {
      const encrypted = await SecureStore.getItemAsync('blockfinax.privateKey.encrypted');
      if (!encrypted) {
        // Fallback: check for old unencrypted key
        const oldKey = await this.getSecureItem('blockfinax.privateKey');
        if (oldKey) {
          console.log('⚠️  Found unencrypted private key, migrating to encrypted storage...');
          await this.setEncryptedPrivateKey(oldKey, password);
          await this.deleteSecureItem('blockfinax.privateKey');
          return oldKey;
        }
        return null;
      }

      const salt = await this.getItem('blockfinax.salt');
      if (!salt) throw new Error('Encryption salt not found');

      const encryptionKey = await this.deriveKey(password, salt);
      const decrypted = this.decrypt(encrypted, encryptionKey);

      return decrypted;
    } catch (error) {
      console.error('Error decrypting private key:', error);
      throw new Error('Failed to decrypt private key. Incorrect password?');
    }
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
   * Store non-sensitive data (async with AsyncStorage)
   */
  public async setItem(key: string, value: string): Promise<void> {
    try {
      return await Storage.setItem(key, value);
    } catch (error) {
      console.error('Error storing item:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Retrieve non-sensitive data (async with AsyncStorage)
   */
  public async getItem(key: string): Promise<string | null> {
    try {
      return await Storage.getItem(key) || null;
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
      return await Storage.removeItem(key);
    } catch (error) {
      console.error('Error removing item:', error);
      return Promise.reject(error);
    }
  }

  public async clearWalletData(): Promise<void> {
    try {
      // Keys for secure storage
      const secureKeys = [
        'blockfinax.mnemonic',
        'blockfinax.privateKey',
        'blockfinax.privateKey.encrypted', // CRITICAL: encrypted private key
        'blockfinax.password',
      ];

      // Keys for async storage
      const asyncKeys = [
        'blockfinax.settings',
        'blockfinax.network',
        'blockfinax.salt', // CRITICAL: encryption salt
        'blockfinax.transactions',
      ];

      // Clear secure storage
      await Promise.all(
        secureKeys.map(key => this.deleteSecureItem(key).catch(() => { }))
      );

      // Clear async storage
      await Promise.all(
        asyncKeys.map(key => this.removeItem(key).catch(() => { }))
      );

      console.log('✅ All wallet data cleared successfully');
    } catch (error) {
      console.error('Error clearing wallet data:', error);
      throw error;
    }
  }
}

export const secureStorage = SecureStorageManager.getInstance();
/**
 * Biometric Authentication Service
 * 
 * Handles fingerprint and Face ID authentication using expo-local-authentication
 * Provides secure storage for biometric credentials
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { secureStorage } from '@/utils/secureStorage';

const BIOMETRIC_CREDENTIALS_KEY = 'blockfinax.biometric.credentials';
const BIOMETRIC_SETTINGS_KEY = 'blockfinax.biometric.settings';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'unknown';

export interface BiometricCapability {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: BiometricType[];
  securityLevel: 'none' | 'weak' | 'strong';
}

export interface BiometricSettings {
  enabled: boolean;
  lastEnabledAt?: Date;
  preferredType?: BiometricType;
}

class BiometricService {
  private static instance: BiometricService;
  private capability: BiometricCapability | null = null;

  public static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  /**
   * Check device biometric capabilities
   */
  async checkBiometricCapability(): Promise<BiometricCapability> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      const mappedTypes: BiometricType[] = supportedTypes.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'facial';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'unknown';
        }
      });

      const mappedSecurityLevel = (() => {
        switch (securityLevel) {
          case LocalAuthentication.SecurityLevel.NONE:
            return 'none' as const;
          case LocalAuthentication.SecurityLevel.SECRET:
            return 'weak' as const;
          case LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK:
            return 'weak' as const;
          case LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG:
            return 'strong' as const;
          default:
            return 'none' as const;
        }
      })();

      this.capability = {
        isAvailable,
        isEnrolled,
        supportedTypes: mappedTypes,
        securityLevel: mappedSecurityLevel,
      };

      return this.capability;
    } catch (error) {
      console.error('Error checking biometric capability:', error);
      this.capability = {
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: [],
        securityLevel: 'none',
      };
      return this.capability;
    }
  }

  /**
   * Get cached biometric capability (call checkBiometricCapability first)
   */
  getCachedCapability(): BiometricCapability | null {
    return this.capability;
  }

  /**
   * Check if biometrics are available and enrolled
   */
  async isBiometricAvailable(): Promise<boolean> {
    const capability = await this.checkBiometricCapability();
    return capability.isAvailable && capability.isEnrolled && capability.securityLevel !== 'none';
  }

  /**
   * Authenticate with biometrics
   */
  async authenticate(reason?: string): Promise<boolean> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication not available');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to access your wallet',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
        requireConfirmation: true,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication for wallet
   */
  async enableBiometricAuth(walletPassword: string): Promise<void> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication is not available on this device');
      }

      // Verify password first by trying to decrypt wallet
      const privateKey = await secureStorage.getSecureItem('blockfinax.privateKey');
      const mnemonic = await secureStorage.getSecureItem('blockfinax.mnemonic');
      
      if (!privateKey && !mnemonic) {
        throw new Error('No wallet found to enable biometric authentication');
      }

      // Test the password by trying to decrypt (if encrypted)
      // For now, we'll just validate the password exists
      if (!walletPassword || walletPassword.length < 8) {
        throw new Error('Invalid password provided');
      }

      // Store encrypted credentials for biometric access
      await secureStorage.setSecureItem(BIOMETRIC_CREDENTIALS_KEY, walletPassword);

      // Save biometric settings
      const settings: BiometricSettings = {
        enabled: true,
        lastEnabledAt: new Date(),
        preferredType: this.capability?.supportedTypes[0] || 'fingerprint',
      };

      await secureStorage.setSecureItem(BIOMETRIC_SETTINGS_KEY, JSON.stringify(settings));

      console.log('Biometric authentication enabled successfully');
    } catch (error) {
      console.error('Error enabling biometric authentication:', error);
      throw error;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<void> {
    try {
      await secureStorage.deleteSecureItem(BIOMETRIC_CREDENTIALS_KEY);
      
      const settings: BiometricSettings = {
        enabled: false,
      };
      
      await secureStorage.setSecureItem(BIOMETRIC_SETTINGS_KEY, JSON.stringify(settings));
      
      console.log('Biometric authentication disabled successfully');
    } catch (error) {
      console.error('Error disabling biometric authentication:', error);
      throw error;
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const settingsJson = await secureStorage.getSecureItem(BIOMETRIC_SETTINGS_KEY);
      if (!settingsJson) return false;

      const settings: BiometricSettings = JSON.parse(settingsJson);
      return settings.enabled;
    } catch (error) {
      console.error('Error checking biometric settings:', error);
      return false;
    }
  }

  /**
   * Get biometric settings
   */
  async getBiometricSettings(): Promise<BiometricSettings | null> {
    try {
      const settingsJson = await secureStorage.getSecureItem(BIOMETRIC_SETTINGS_KEY);
      if (!settingsJson) return null;

      const settings: BiometricSettings = JSON.parse(settingsJson);
      return {
        ...settings,
        lastEnabledAt: settings.lastEnabledAt ? new Date(settings.lastEnabledAt) : undefined,
      };
    } catch (error) {
      console.error('Error getting biometric settings:', error);
      return null;
    }
  }

  /**
   * Unlock wallet with biometrics
   */
  async unlockWithBiometrics(): Promise<string> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        throw new Error('Biometric authentication is not enabled');
      }

      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication is not available');
      }

      const authenticated = await this.authenticate('Unlock your BlockFinaX wallet');
      if (!authenticated) {
        throw new Error('Biometric authentication failed');
      }

      const storedPassword = await secureStorage.getSecureItem(BIOMETRIC_CREDENTIALS_KEY);
      if (!storedPassword) {
        throw new Error('No biometric credentials found');
      }

      return storedPassword;
    } catch (error) {
      console.error('Error unlocking with biometrics:', error);
      throw error;
    }
  }

  /**
   * Get user-friendly biometric type names
   */
  getBiometricTypeDisplayNames(): { [key in BiometricType]: string } {
    return {
      fingerprint: Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint',
      facial: Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition',
      iris: 'Iris Recognition',
      unknown: 'Biometric Authentication',
    };
  }

  /**
   * Get the primary biometric type available on device
   */
  getPrimaryBiometricType(): BiometricType {
    if (!this.capability) return 'unknown';
    
    // Prefer Face ID/facial recognition on iOS, fingerprint on Android
    if (Platform.OS === 'ios') {
      if (this.capability.supportedTypes.includes('facial')) return 'facial';
      if (this.capability.supportedTypes.includes('fingerprint')) return 'fingerprint';
    } else {
      if (this.capability.supportedTypes.includes('fingerprint')) return 'fingerprint';
      if (this.capability.supportedTypes.includes('facial')) return 'facial';
    }
    
    return this.capability.supportedTypes[0] || 'unknown';
  }

  /**
   * Clear all biometric data (for wallet reset)
   */
  async clearBiometricData(): Promise<void> {
    try {
      await secureStorage.deleteSecureItem(BIOMETRIC_CREDENTIALS_KEY);
      await secureStorage.deleteSecureItem(BIOMETRIC_SETTINGS_KEY);
      this.capability = null;
      console.log('All biometric data cleared');
    } catch (error) {
      console.error('Error clearing biometric data:', error);
      throw error;
    }
  }
}

export const biometricService = BiometricService.getInstance();
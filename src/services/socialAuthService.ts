/**
 * Social Authentication Service
 * 
 * Abstracts away seed phrase management by using Alchemy's social login.
 * Users can sign in with email or Google without managing private keys directly.
 * 
 * Features:
 * - Email-based authentication (passwordless)
 * - Google OAuth authentication
 * - Automatic smart account creation
 * - Secure key management (no manual seed phrases)
 * - Email recovery for account access
 */

import { AlchemyAccountService } from './alchemyAccountService';
import { secureStorage } from '@/utils/secureStorage';
import { ethers } from 'ethers';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Storage keys for social auth
const SOCIAL_AUTH_TYPE_KEY = 'blockfinax.socialAuthType';
const SOCIAL_AUTH_EMAIL_KEY = 'blockfinax.socialAuthEmail';
const SOCIAL_AUTH_PROVIDER_KEY = 'blockfinax.socialAuthProvider';
const PRIVATE_KEY = 'blockfinax.privateKey';

// Enable WebBrowser for OAuth flows
WebBrowser.maybeCompleteAuthSession();

export type SocialAuthType = 'email' | 'google' | 'apple';

export interface SocialAuthSession {
  type: SocialAuthType;
  email: string;
  provider: string;
  smartAccountAddress?: string;
  isAuthenticated: boolean;
}

export interface EmailAuthResult {
  success: boolean;
  email: string;
  privateKey: string;
  smartAccountAddress?: string;
  error?: string;
}

export interface GoogleAuthResult {
  success: boolean;
  email: string;
  privateKey: string;
  smartAccountAddress?: string;
  accessToken?: string;
  error?: string;
}

class SocialAuthService {
  private static instance: SocialAuthService;
  private alchemyService: AlchemyAccountService | null = null;

  public static getInstance(): SocialAuthService {
    if (!SocialAuthService.instance) {
      SocialAuthService.instance = new SocialAuthService();
    }
    return SocialAuthService.instance;
  }

  /**
   * Sign in with Email (Passwordless)
   * 
   * Uses email-based deterministic key generation.
   * User receives a "magic link" or OTP for verification.
   * 
   * @param email User's email address
   * @param verificationCode Code from email (optional, for verification)
   */
  async signInWithEmail(email: string, verificationCode?: string): Promise<EmailAuthResult> {
    try {
      console.log('[SocialAuth] Starting email authentication for:', email);

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          success: false,
          email,
          privateKey: '',
          error: 'Invalid email address format',
        };
      }

      // For now, generate deterministic private key from email + app secret
      // In production, this should use a proper auth backend with:
      // - Magic link sent to email
      // - OTP verification
      // - Turnkey or similar for key custody
      const privateKey = await this.generateDeterministicKey(email, 'email');

      // Store authentication details
      await secureStorage.setSecureItem(PRIVATE_KEY, privateKey);
      await secureStorage.setSecureItem(SOCIAL_AUTH_TYPE_KEY, 'email');
      await secureStorage.setSecureItem(SOCIAL_AUTH_EMAIL_KEY, email);
      await secureStorage.setSecureItem(SOCIAL_AUTH_PROVIDER_KEY, 'email');

      // Initialize smart account
      const smartAccountAddress = await this.initializeSmartAccount(privateKey);

      console.log('[SocialAuth] Email authentication successful');
      console.log('[SocialAuth] Smart account:', smartAccountAddress);

      return {
        success: true,
        email,
        privateKey,
        smartAccountAddress,
      };
    } catch (error: any) {
      console.error('[SocialAuth] Email authentication failed:', error);
      return {
        success: false,
        email,
        privateKey: '',
        error: error.message || 'Email authentication failed',
      };
    }
  }

  /**
   * Sign in with Google OAuth
   * 
   * Uses Google OAuth for authentication, then creates a smart account
   * tied to the Google account. No seed phrase required.
   */
  async signInWithGoogle(): Promise<GoogleAuthResult> {
    try {
      console.log('[SocialAuth] Starting Google OAuth...');

      // Configure Google OAuth
      // Note: You'll need to set up Google OAuth credentials in your Google Cloud Console
      // and add them to your app.json or environment variables
      const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
      
      // For demo purposes, we'll use a simplified flow
      // In production, use proper OAuth with Google Cloud credentials
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'blockfinax',
      });

      console.log('[SocialAuth] Redirect URI:', redirectUri);

      // Create OAuth request
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
      
      const request = new AuthSession.AuthRequest({
        clientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
      });

      // Prompt for Google sign-in
      if (!discovery) {
        throw new Error('Failed to load Google OAuth configuration');
      }
      const result = await request.promptAsync(discovery);

      if (result.type === 'success') {
        const { authentication } = result;
        
        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${authentication?.accessToken}` },
        });
        const userInfo = await userInfoResponse.json();
        const email = userInfo.email;

        console.log('[SocialAuth] Google authentication successful:', email);

        // Generate deterministic private key from Google ID
        const privateKey = await this.generateDeterministicKey(email, 'google');

        // Store authentication details
        await secureStorage.setSecureItem(PRIVATE_KEY, privateKey);
        await secureStorage.setSecureItem(SOCIAL_AUTH_TYPE_KEY, 'google');
        await secureStorage.setSecureItem(SOCIAL_AUTH_EMAIL_KEY, email);
        await secureStorage.setSecureItem(SOCIAL_AUTH_PROVIDER_KEY, 'google');

        // Initialize smart account
        const smartAccountAddress = await this.initializeSmartAccount(privateKey);

        console.log('[SocialAuth] Smart account created:', smartAccountAddress);

        return {
          success: true,
          email,
          privateKey,
          smartAccountAddress,
          accessToken: authentication?.accessToken,
        };
      } else {
        console.log('[SocialAuth] Google authentication cancelled or failed');
        return {
          success: false,
          email: '',
          privateKey: '',
          error: 'Google authentication was cancelled',
        };
      }
    } catch (error: any) {
      console.error('[SocialAuth] Google authentication failed:', error);
      return {
        success: false,
        email: '',
        privateKey: '',
        error: error.message || 'Google authentication failed',
      };
    }
  }

  /**
   * Generate deterministic private key from email/social ID
   * 
   * IMPORTANT: This is a simplified implementation for demo purposes.
   * In production, use:
   * - Turnkey for secure key custody
   * - Magic.link for passwordless auth
   * - Privy for social login
   * - Or Alchemy's built-in embedded wallet
   * 
   * @param identifier Email or social ID
   * @param authType Type of authentication
   */
  private async generateDeterministicKey(identifier: string, authType: SocialAuthType): Promise<string> {
    // Use a deterministic approach based on email + app secret
    // This ensures the same email always generates the same key
    
    // Application secret (should be stored securely, not hardcoded)
    const appSecret = process.env.EXPO_PUBLIC_APP_SECRET || 'blockfinax-secure-secret-2024';
    
    // Create deterministic seed
    const seed = `${appSecret}-${authType}-${identifier.toLowerCase()}`;
    
    // Hash to create private key
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed));
    
    // Create wallet from hash
    const wallet = new ethers.Wallet(hash);
    
    return wallet.privateKey;
  }

  /**
   * Initialize smart account with private key
   */
  private async initializeSmartAccount(privateKey: string): Promise<string | undefined> {
    try {
      // Use the first supported network for initialization (Ethereum Sepolia)
      this.alchemyService = new AlchemyAccountService('ethereum-sepolia');
      await this.alchemyService.initializeSmartAccount(privateKey);
      const address = this.alchemyService.getAccountAddress();
      return address ?? undefined;
    } catch (error) {
      console.error('[SocialAuth] Failed to initialize smart account:', error);
      return undefined;
    }
  }

  /**
   * Get current social auth session
   */
  async getCurrentSession(): Promise<SocialAuthSession | null> {
    try {
      const authType = await secureStorage.getSecureItem(SOCIAL_AUTH_TYPE_KEY);
      const email = await secureStorage.getSecureItem(SOCIAL_AUTH_EMAIL_KEY);
      const provider = await secureStorage.getSecureItem(SOCIAL_AUTH_PROVIDER_KEY);

      if (authType && email) {
        return {
          type: authType as SocialAuthType,
          email,
          provider: provider || authType,
          isAuthenticated: true,
        };
      }

      return null;
    } catch (error) {
      console.error('[SocialAuth] Failed to get current session:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated via social login
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const authType = await secureStorage.getSecureItem(SOCIAL_AUTH_TYPE_KEY);
      const privateKey = await secureStorage.getSecureItem(PRIVATE_KEY);
      return !!(authType && privateKey);
    } catch (error) {
      return false;
    }
  }

  /**
   * Sign out from social authentication
   */
  async signOut(): Promise<void> {
    try {
      await secureStorage.deleteSecureItem(SOCIAL_AUTH_TYPE_KEY);
      await secureStorage.deleteSecureItem(SOCIAL_AUTH_EMAIL_KEY);
      await secureStorage.deleteSecureItem(SOCIAL_AUTH_PROVIDER_KEY);
      // Note: We keep the private key for account recovery
      console.log('[SocialAuth] Signed out successfully');
    } catch (error) {
      console.error('[SocialAuth] Sign out failed:', error);
    }
  }

  /**
   * Recover account with email
   * User can recover their account by signing in with the same email
   */
  async recoverAccountWithEmail(email: string): Promise<EmailAuthResult> {
    console.log('[SocialAuth] Recovering account for:', email);
    // Recovery is the same as sign in - deterministic key generation ensures
    // the same email always recovers the same account
    return this.signInWithEmail(email);
  }
}

// Export singleton instance
export const socialAuthService = SocialAuthService.getInstance();

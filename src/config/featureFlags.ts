/**
 * Feature Flags Configuration
 * 
 * Central configuration for feature toggles across the app.
 * These flags allow gradual rollout and A/B testing of new features.
 */

export interface FeatureFlags {
  /**
   * Use Alchemy Account Abstraction instead of Pimlico
   * 
   * When true: Uses Alchemy SDK for smart accounts
   * When false: Uses Pimlico/permissionless for smart accounts
   * 
   * Default: false (use Pimlico for backward compatibility)
   */
  USE_ALCHEMY_AA: boolean;

  /**
   * Enable Alchemy AA for specific screens only
   * 
   * Use this for gradual rollout. If USE_ALCHEMY_AA is false,
   * this is ignored. If USE_ALCHEMY_AA is true, only these
   * screens will use Alchemy.
   * 
   * Empty array = all screens use Alchemy (when USE_ALCHEMY_AA is true)
   */
  ALCHEMY_AA_SCREENS: string[];

  /**
   * Enable verbose logging for Alchemy operations
   * Useful for debugging during migration
   */
  ALCHEMY_DEBUG_MODE: boolean;

  /**
   * Enable gas sponsorship via Alchemy Gas Manager
   * Requires EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID to be set
   */
  ALCHEMY_GAS_SPONSORSHIP: boolean;
}

/**
 * Feature Flags
 * 
 * Toggle these to enable/disable features during migration.
 */
export const FEATURE_FLAGS: FeatureFlags = {
  // Phase 2: Start with Alchemy disabled, test manually
  USE_ALCHEMY_AA: true,

  // Phase 3: Enable for specific screens during gradual rollout
  // Example: ['DebugScreen', 'TestTransactionScreen']
  ALCHEMY_AA_SCREENS: [],

  // Enable debug logging during development
  ALCHEMY_DEBUG_MODE: __DEV__,

  // Enable gas sponsorship if policy is configured
  ALCHEMY_GAS_SPONSORSHIP: !!process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID,
};

/**
 * Check if Alchemy AA should be used for a specific screen
 * 
 * @param screenName - Name of the screen
 * @returns true if Alchemy should be used, false otherwise
 */
export function shouldUseAlchemyForScreen(screenName?: string): boolean {
  if (!FEATURE_FLAGS.USE_ALCHEMY_AA) {
    return false;
  }

  // If no screens specified, use Alchemy for all
  if (FEATURE_FLAGS.ALCHEMY_AA_SCREENS.length === 0) {
    return true;
  }

  // Check if screen is in the allowlist
  return screenName ? FEATURE_FLAGS.ALCHEMY_AA_SCREENS.includes(screenName) : false;
}

/**
 * Environment-based feature flag overrides
 * 
 * These can be set via environment variables for testing
 */
export function getFeatureFlagsWithOverrides(): FeatureFlags {
  return {
    ...FEATURE_FLAGS,
    // Allow override via environment variable
    USE_ALCHEMY_AA: 
      process.env.EXPO_PUBLIC_USE_ALCHEMY_AA === 'true' 
        ? true 
        : FEATURE_FLAGS.USE_ALCHEMY_AA,
  };
}

/**
 * Log current feature flag state (for debugging)
 */
export function logFeatureFlags(): void {
  if (__DEV__) {
    console.log('[FeatureFlags] Current configuration:', {
      USE_ALCHEMY_AA: FEATURE_FLAGS.USE_ALCHEMY_AA,
      ALCHEMY_AA_SCREENS: FEATURE_FLAGS.ALCHEMY_AA_SCREENS,
      ALCHEMY_DEBUG_MODE: FEATURE_FLAGS.ALCHEMY_DEBUG_MODE,
      ALCHEMY_GAS_SPONSORSHIP: FEATURE_FLAGS.ALCHEMY_GAS_SPONSORSHIP,
    });
  }
}

import { SupportedNetworkId } from "@/contexts/WalletContext";
import { entryPoint07Address } from "viem/account-abstraction";

/**
 * Pimlico Smart Account Configuration
 * 
 * ERC-4337 Account Abstraction enables:
 * - Gasless transactions (sponsored by paymaster)
 * - Batch transactions (multiple operations in one)
 * - Programmable accounts (custom validation logic)
 * - Social recovery and session keys
 */

export interface PimlicoConfig {
  apiKey: string;
  bundlerUrl: string;
  paymasterUrl: string;
}

// Pimlico API Configuration
// Get your API key from: https://dashboard.pimlico.io/
export const PIMLICO_API_KEY = process.env.EXPO_PUBLIC_PIMLICO_API_KEY || "";

/**
 * Get Pimlico configuration for a specific network
 */
export function getPimlicoConfig(networkId: SupportedNetworkId): PimlicoConfig | null {
  const chainMapping: Record<SupportedNetworkId, string | null> = {
    // Mainnets
    "ethereum-mainnet": "ethereum",
    "base-mainnet": "base",
    "lisk-mainnet": "lisk",
    "bsc-mainnet": "bsc",
    
    // Testnets
    "ethereum-sepolia": "sepolia",
    "bsc-testnet": "bsc-testnet",
    "base-sepolia": "base-sepolia",
    "lisk-sepolia": "lisk-sepolia",
  };

  const pimlicoChain = chainMapping[networkId];
  
  if (!pimlicoChain || !PIMLICO_API_KEY) {
    return null;
  }

  return {
    apiKey: PIMLICO_API_KEY,
    bundlerUrl: `https://api.pimlico.io/v2/${pimlicoChain}/rpc?apikey=${PIMLICO_API_KEY}`,
    paymasterUrl: `https://api.pimlico.io/v2/${pimlicoChain}/rpc?apikey=${PIMLICO_API_KEY}`,
  };
}

/**
 * EntryPoint addresses for different versions
 * EntryPoint v0.7 is the latest and most recommended
 */
export const ENTRYPOINT_V07_ADDRESS = entryPoint07Address;
export const ENTRYPOINT_V06_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as const;

/**
 * Smart Account Configuration
 */
export const SMART_ACCOUNT_CONFIG = {
  // Use EntryPoint v0.7 (latest)
  entryPointVersion: "0.7" as const,
  entryPointAddress: ENTRYPOINT_V07_ADDRESS,
  
  // Account type: "simple" | "safe" | "kernel" | "biconomy"
  // Simple: Single signer, lightweight
  // Safe: Multi-sig capable, battle-tested
  accountType: "simple" as const,
  
  // Sponsorship policy - if you have a custom policy ID
  sponsorshipPolicyId: process.env.EXPO_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID,
};

/**
 * Check if smart accounts are enabled
 */
export function isSmartAccountEnabled(): boolean {
  return Boolean(PIMLICO_API_KEY);
}

/**
 * Check if a network supports smart accounts via Pimlico
 */
export function isNetworkSupported(networkId: SupportedNetworkId): boolean {
  return getPimlicoConfig(networkId) !== null;
}

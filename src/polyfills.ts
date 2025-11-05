// polyfills.ts - Essential polyfills for ethers.js v5 in React Native

// CRITICAL: Load react-native-get-random-values FIRST
// This patches global.crypto.getRandomValues for secure random
import "react-native-get-random-values";

// Buffer polyfill - required by ethers and crypto libraries
import { Buffer } from "@craftzdog/react-native-buffer";
if (!globalThis.Buffer) {
  (globalThis as any).Buffer = Buffer;
}

// Load ethers shims AFTER crypto and Buffer are available
import "@ethersproject/shims";

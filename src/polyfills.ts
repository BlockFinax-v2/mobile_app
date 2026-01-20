// polyfills.ts - Essential polyfills for ethers.js v5 in React Native

// CRITICAL: Load react-native-get-random-values FIRST
// This patches global.crypto.getRandomValues for secure random
import "react-native-get-random-values";

// Buffer polyfill - required by ethers and crypto libraries
import { Buffer } from "@craftzdog/react-native-buffer";
if (!globalThis.Buffer) {
  (globalThis as any).Buffer = Buffer;
}
if (!(global as any).Buffer) {
  (global as any).Buffer = Buffer;
}

// Add base64FromArrayBuffer polyfill for expo-secure-store
// This function is required by expo-secure-store but not provided in React Native
const base64FromArrayBuffer = function(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  return Buffer.from(bytes).toString('base64');
};

if (typeof (globalThis as any).base64FromArrayBuffer === 'undefined') {
  (globalThis as any).base64FromArrayBuffer = base64FromArrayBuffer;
}
if (typeof (global as any).base64FromArrayBuffer === 'undefined') {
  (global as any).base64FromArrayBuffer = base64FromArrayBuffer;
}

console.log('✅ Polyfills loaded:', {
  Buffer: typeof Buffer !== 'undefined',
  globalBuffer: typeof (global as any).Buffer !== 'undefined',
  globalBase64: typeof (global as any).base64FromArrayBuffer !== 'undefined',
  globalThisBase64: typeof (globalThis as any).base64FromArrayBuffer !== 'undefined'
});

// Ensure crypto.getRandomValues is available globally
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}

// Add additional crypto utilities if needed
if (!globalThis.crypto.getRandomValues && typeof require !== 'undefined') {
  try {
    const { getRandomValues } = require('react-native-get-random-values');
    globalThis.crypto.getRandomValues = getRandomValues;
  } catch (e) {
    console.warn('Could not setup crypto.getRandomValues:', e);
  }
}

// Load ethers shims AFTER crypto and Buffer are available
import "@ethersproject/shims";

// Additional debugging to ensure crypto is working
console.log('Polyfills loaded - crypto available:', !!globalThis.crypto);
console.log('getRandomValues available:', !!globalThis.crypto?.getRandomValues);
console.log('Buffer available:', !!globalThis.Buffer);

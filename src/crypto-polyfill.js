// crypto-polyfill.js - Crypto module polyfill for React Native
import { Buffer } from '@craftzdog/react-native-buffer';
import 'react-native-get-random-values';

function randomBytes(size) {
  const array = new Uint8Array(size);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
    return Buffer.from(array);
  } else {
    throw new Error('crypto.getRandomValues not available');
  }
}

function randomFillSync(array) {
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    return globalThis.crypto.getRandomValues(array);
  } else {
    throw new Error('crypto.getRandomValues not available');
  }
}

export {
    randomBytes,
    randomFillSync
};

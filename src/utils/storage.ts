import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Universal Storage Shim
 * 
 * Why this exists:
 * 1. MMKV is extremely fast and synchronous, but doesn't work in Expo Go.
 * 2. AsyncStorage works in Expo Go but is asynchronous and slower.
 * 
 * This shim pre-loads data into memory at startup so that the synchronous 
 * API of MMKV can be maintained even when running in Expo Go.
 */

let mmkv: any = null;
const memoryCache = new Map<string, string>();
let isExpoGo = false;

// 1. Try to initialize MMKV
try {
    const { MMKV } = require('react-native-mmkv');
    mmkv = new MMKV({
        id: 'blockfinax-storage',
        encryptionKey: 'blockfinax-storage-key'
    });
} catch (e) {
    console.warn("[Storage] MMKV native module not found. Falling back to AsyncStorage (Expo Go mode).");
    isExpoGo = true;
}

// 2. If in Expo Go mode, pre-hydrate the memory cache
if (isExpoGo) {
    // We kick off the hydration immediately. 
    AsyncStorage.getAllKeys().then(keys => {
        AsyncStorage.multiGet(keys).then(pairs => {
            pairs.forEach(([key, value]) => {
                if (value !== null) memoryCache.set(key, value);
            });
        });
    }).catch(err => {
        console.error("[Storage] Failed to hydrate memory cache from AsyncStorage:", err);
    });
}

export const Storage = {
    /**
     * Set a string value
     * Returns Promise<void> for backward compatibility with .catch() calls,
     * but the memory update is synchronous.
     */
    setItem: (key: string, value: string): Promise<void> => {
        if (mmkv) {
            mmkv.set(key, value);
            return Promise.resolve();
        } else {
            memoryCache.set(key, value);
            return AsyncStorage.setItem(key, value);
        }
    },

    /**
     * Get a string value
     */
    getItem: (key: string): string | undefined => {
        if (mmkv) {
            return mmkv.getString(key);
        }
        return memoryCache.get(key);
    },

    /**
     * Set a JSON object
     */
    setJSON: (key: string, value: any): Promise<void> => {
        try {
            const stringConfig = JSON.stringify(value);
            return Storage.setItem(key, stringConfig);
        } catch (error) {
            console.error(`[Storage] Error setting JSON for key ${key}:`, error);
            return Promise.reject(error);
        }
    },

    /**
     * Get a JSON object
     */
    getJSON: <T>(key: string): T | null => {
        try {
            const val = Storage.getItem(key);
            return val ? JSON.parse(val) : null;
        } catch (error) {
            console.error(`[Storage] Error getting JSON for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Remove an item
     */
    removeItem: (key: string): Promise<void> => {
        if (mmkv) {
            mmkv.delete(key);
            return Promise.resolve();
        } else {
            memoryCache.delete(key);
            return AsyncStorage.removeItem(key);
        }
    },

    /**
     * Clear all items
     */
    clearAll: (async: boolean = false): Promise<void> => {
        if (mmkv) {
            mmkv.clearAll();
            return Promise.resolve();
        } else {
            memoryCache.clear();
            return AsyncStorage.clear();
        }
    },

    /**
     * Get all keys
     */
    getAllKeys: (): string[] => {
        if (mmkv) {
            return mmkv.getAllKeys();
        }
        return Array.from(memoryCache.keys());
    }
};

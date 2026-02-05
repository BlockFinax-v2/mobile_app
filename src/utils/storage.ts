import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Universal Storage Utility
 * 
 * Replaced MMKV with AsyncStorage for consistency between Expo Go and Production.
 * Uses AsyncStorage directly to ensure data is saved to the standard system storage.
 */

export const Storage = {
    /**
     * Set a string value
     */
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            await AsyncStorage.setItem(key, value);
        } catch (error) {
            console.error(`[Storage] Error setting item for key ${key}:`, error);
            throw error;
        }
    },

    /**
     * Get a string value
     */
    getItem: async (key: string): Promise<string | null> => {
        try {
            return await AsyncStorage.getItem(key);
        } catch (error) {
            console.error(`[Storage] Error getting item for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Set a JSON object
     */
    setJSON: async (key: string, value: any): Promise<void> => {
        try {
            const stringConfig = JSON.stringify(value);
            return await Storage.setItem(key, stringConfig);
        } catch (error) {
            console.error(`[Storage] Error setting JSON for key ${key}:`, error);
            throw error;
        }
    },

    /**
     * Get a JSON object
     */
    getJSON: async <T>(key: string): Promise<T | null> => {
        try {
            const val = await Storage.getItem(key);
            return val ? JSON.parse(val) : null;
        } catch (error) {
            console.error(`[Storage] Error getting JSON for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Remove an item
     */
    removeItem: async (key: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error(`[Storage] Error removing item for key ${key}:`, error);
            throw error;
        }
    },

    /**
     * Clear all items
     */
    clearAll: async (): Promise<void> => {
        try {
            await AsyncStorage.clear();
        } catch (error) {
            console.error(`[Storage] Error clearing storage:`, error);
            throw error;
        }
    },

    /**
     * Get all keys
     */
    getAllKeys: async (): Promise<string[]> => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            return [...keys]; // Convert readonly string[] to string[]
        } catch (error) {
            console.error(`[Storage] Error getting all keys:`, error);
            return [];
        }
    }
};

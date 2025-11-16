import Constants from 'expo-constants';

// Configuration for different environments
const config = {
  development: {
    socketUrl: 'http://localhost:3001',
  },
  production: {
    socketUrl: 'https://server-production-2529.up.railway.app',
  },
};

// Get the current environment
const getCurrentEnvironment = () => {
  if (__DEV__) {
    return 'development';
  }
  return 'production';
};

// Get socket URL with fallback logic
const getSocketUrl = () => {
  // First, try to get from Expo Constants (works in both dev and built apps)
  const expoSocketUrl = Constants.expoConfig?.extra?.socketUrl;
  if (expoSocketUrl) {
    return expoSocketUrl;
  }

  // Second, try environment variable (works in development)
  const envSocketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (envSocketUrl) {
    return envSocketUrl;
  }

  // Third, use environment-based config
  const env = getCurrentEnvironment();
  return config[env].socketUrl;
};

export const AppConfig = {
  socketUrl: getSocketUrl(),
  environment: getCurrentEnvironment(),
  isProduction: !__DEV__,
  
  // Performance Settings - Set ENABLE_PERSISTENCE to false for maximum speed
  ENABLE_PERSISTENCE: false, // Disable to make app super fast (no data saved)
  ENABLE_WALLET_PERSISTENCE: false, // Disable wallet state persistence  
  ENABLE_COMMUNICATION_PERSISTENCE: false, // Disable messages/contacts persistence
  
  // Performance optimizations
  AUTO_LOCK_INTERVAL: 15 * 60 * 1000, // 15 minutes
  THROTTLE_NETWORK_CALLS: 1000, // 1 second
  DEBOUNCE_STATE_UPDATES: 500,  // 500ms
  
  // Debug info
  debug: {
    expoSocketUrl: Constants.expoConfig?.extra?.socketUrl,
    envSocketUrl: process.env.EXPO_PUBLIC_SOCKET_URL,
    computedSocketUrl: getSocketUrl(),
    isDev: __DEV__,
  }
};

// Log configuration for debugging
console.log('🔧 AppConfig initialized:', AppConfig);

export default AppConfig;
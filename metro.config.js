const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration for React Native
config.resolver.alias = {
  'stream': 'readable-stream',
  'buffer': '@craftzdog/react-native-buffer',
};

// Add node_modules that should be resolved
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
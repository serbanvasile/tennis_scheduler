// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver to handle SQLite modules on web
config.resolver.platforms = ['web', 'native', 'ios', 'android'];

config.resolver.alias = {
  ...config.resolver.alias,
  // Redirect problematic SQLite imports to empty modules on web
  'better-sqlite3': 'empty-module',
  'react-native-sqlite-storage': 'empty-module',
};

// Exclude SQLite modules from web bundles
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;

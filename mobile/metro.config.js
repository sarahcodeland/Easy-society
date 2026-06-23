const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

// Watches the monorepo's /shared package so changes there hot-reload too.
const config = {
  watchFolders: [path.resolve(__dirname, '../shared')],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../shared/node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

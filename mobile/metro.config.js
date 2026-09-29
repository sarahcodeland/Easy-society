const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('metro-config');
const path = require('path');

// Watches the monorepo's /shared package so changes there hot-reload too.
const config = {
  watchFolders: [path.resolve(__dirname, '../shared')],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../shared/node_modules'),
    ],
    // Bundle @easysociety/shared from its TypeScript source instead of its
    // gitignored dist/. EAS installs with yarn, which *copies* the file:
    // dependency before any build hook runs, so dist/ never exists there.
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === '@easysociety/shared') {
        return { type: 'sourceFile', filePath: path.resolve(__dirname, '../shared/src/index.ts') };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

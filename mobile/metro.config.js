const { getDefaultConfig, mergeConfig } = require('metro-config');

const defaultConfig = getDefaultConfig.getDefaultValues(__dirname);

module.exports = mergeConfig(defaultConfig, {
  serializer: {
    getPolyfills: () => require('react-native/rn-get-polyfills')(),
  },
  transformer: {
    babelTransformerPath: require.resolve('@react-native/metro-babel-transformer'),
    assetRegistryPath: 'react-native/Libraries/Image/AssetRegistry',
    allowOptionalDependencies: true,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx'],
  },
});


module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // babel-preset-expo (SDK 58) injects react-native-worklets/plugin.
      // nativewind/babel injects the same plugin. A second copy fails the bundle.
      ['babel-preset-expo', { jsxImportSource: 'nativewind', reanimated: false }],
      'nativewind/babel',
    ],
  };
};

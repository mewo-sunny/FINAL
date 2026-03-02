module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Keep this only if you use Drawer/Animation, otherwise it's fine to keep.
    ],
  };
};
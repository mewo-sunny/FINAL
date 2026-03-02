const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add both tflite and txt to the asset extensions
config.resolver.assetExts.push('tflite', 'txt');

module.exports = config;
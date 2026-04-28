const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add both onnx and tflite to be safe
config.resolver.assetExts.push('onnx');
config.resolver.assetExts.push('tflite');

module.exports = config;
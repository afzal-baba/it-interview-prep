const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Prevent Metro from watching openid-client's temp cache directory (server-side dep).
config.resolver.blockList = [/\.cache\/openid-client\/.*/];

module.exports = config;

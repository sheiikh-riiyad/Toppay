const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existingBlockList = config.resolver.blockList;

// CMake creates and removes temporary folders while Metro is watching files.
// Watching these generated folders can crash Metro on Windows with ENOENT.
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList ? [existingBlockList] : []),
  /[/\\]android[/\\]\.cxx[/\\].*/,
];

module.exports = config;

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: watch root for changes
config.watchFolders = [monorepoRoot];

// Monorepo: resolve node_modules — mobile FIRST, then root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// CRITICAL: Block root monorepo react & react-native from being resolved
// Root has react 19.2.3 + RN 0.83.2, mobile needs react 19.1.0 + RN 0.81.5
// Loading wrong RN version causes "property is not writable" in Hermes
const rootNM = path.resolve(monorepoRoot, 'node_modules');
config.resolver.blockList = [
  new RegExp(
    rootNM.replace(/[\\\/]/g, '[/\\\\]') + '[/\\\\]react[/\\\\].*'
  ),
  new RegExp(
    rootNM.replace(/[\\\/]/g, '[/\\\\]') + '[/\\\\]react-dom[/\\\\].*'
  ),
  new RegExp(
    rootNM.replace(/[\\\/]/g, '[/\\\\]') + '[/\\\\]react-native[/\\\\].*'
  ),
];

module.exports = config;

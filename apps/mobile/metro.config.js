const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve modules from the monorepo root (packages/)
config.watchFolders = [monorepoRoot];

// Ensure Metro can find packages in both the app and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Resolve the @acnetrex/ml-local-runtime package correctly
config.resolver.extraNodeModules = {
  "@acnetrex/ml-local-runtime": path.resolve(
    monorepoRoot,
    "packages/ml-local-runtime"
  ),
};

module.exports = config;

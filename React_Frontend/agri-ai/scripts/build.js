const resolvedTerserPlugin = require.resolve("terser-webpack-plugin");
const OriginalTerserPlugin = require(resolvedTerserPlugin);

class SingleProcessTerserPlugin extends OriginalTerserPlugin {
  constructor(options = {}) {
    super({ ...options, parallel: false });
  }
}

Object.assign(SingleProcessTerserPlugin, OriginalTerserPlugin);
require.cache[resolvedTerserPlugin].exports = SingleProcessTerserPlugin;

require("../node_modules/react-scripts/scripts/build");

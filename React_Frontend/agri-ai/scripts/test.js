const resolvedHasteMap = require.resolve("jest-haste-map/build/index.js");
const hasteMapModule = require(resolvedHasteMap);
const HasteMap = hasteMapModule.default || hasteMapModule;
const originalGetWorker = HasteMap.prototype._getWorker;

process.env.CI = "true";

HasteMap.prototype._getWorker = function patchedGetWorker(options) {
  return originalGetWorker.call(this, { ...(options || {}), forceInBand: true });
};

if (!process.argv.includes("--runInBand")) {
  process.argv.push("--runInBand");
}

require("../node_modules/react-scripts/scripts/test");

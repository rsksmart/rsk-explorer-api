"use strict";
var _dataSource = require("../lib/dataSource.js");
var _Logger = require("../lib/Logger");
var _blocksCollections = require("../lib/blocksCollections");
const log = (0, _Logger.Logger)('showTraces', { level: 'trace' });
const every = process.argv[2] || 10000;

main();

async function main() {
  try {
    const { db } = await (0, _dataSource.setup)({ skipCheck: true });
    const collections = await (0, _blocksCollections.getDbBlocksCollections)(db);
    const collection = collections.BlocksTraces;
    const traces = await collection.estimatedDocumentCount();
    log.info(`Traces: ${traces}`);
    setTimeout(main, every);
  } catch (err) {
    log.error(err);
    process.exit(9);
  }
}
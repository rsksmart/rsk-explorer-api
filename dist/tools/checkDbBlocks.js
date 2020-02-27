"use strict";var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _blocksCollections = require("../lib/blocksCollections");
var _fs = _interopRequireDefault(require("fs"));
var _util = _interopRequireDefault(require("util"));
var _CheckBlocks = require("../services/classes/CheckBlocks");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const writeFile = _util.default.promisify(_fs.default.writeFile);
const outFile = process.argv[2] || '/tmp/blocksLog.json';
(0, _dataSource.default)({ skipCheck: true }).then(async ({ db }) => {
  try {
    const { Blocks, Txs } = (0, _blocksCollections.getDbBlocksCollections)(db);
    console.log('Getting blocks....');
    let res = await (0, _CheckBlocks.checkBlocksCongruence)(Blocks);
    res.missingTxs = await (0, _CheckBlocks.checkBlocksTransactions)(Blocks, Txs);

    res.missingTotal = res.missing.length;
    res.invalidTotal = res.invalid.length;
    res.missingTxsTotal = res.missingTxs.length;

    console.log(`Missing Blocks:  ${res.missingTotal}`);
    console.log(`Invalid Blocks: ${res.invalidTotal}`);
    console.log(`Blocks with missing txs: ${res.missingTxsTotal}`);

    await writeFile(outFile, JSON.stringify(res));
    console.log(`Log saved on: ${outFile}`);
    process.exit(0);
  } catch (err) {
    console.log(err);
    process.exit(9);
  }
});
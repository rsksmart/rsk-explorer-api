"use strict";var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _blocksCollections = require("../lib/blocksCollections");
var _fs = _interopRequireDefault(require("fs"));
var _path = _interopRequireDefault(require("path"));
var _util = _interopRequireDefault(require("util"));

var _CheckBlocks = require("../services/classes/CheckBlocks");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const checkTxs = process.argv.find(a => a === '--txs');
const checkBlocks = process.argv.find(a => a === '--blocks');
if (!checkTxs && !checkBlocks) {
  console.log('Usage:');
  console.log(`${process.argv[0]} ${process.argv[1]} [--blocks][--txs] [--out dir]`);
  console.log('--blocks search for missing blocks');
  console.log('--txs:  search for missing transactions');
  console.log('--out:  path to save results');
  process.exit(0);
}
const out = process.argv.findIndex(a => a === '--out');
const outDir = out ? _fs.default.existsSync(process.argv[out + 1]) ? _path.default.resolve(process.argv[out + 1]) : _path.default.resolve('./') : null;
const writeFile = _util.default.promisify(_fs.default.writeFile);

(0, _dataSource.default)({ skipCheck: true }).then(async ({ db }) => {
  try {
    const { Blocks, Txs } = (0, _blocksCollections.getDbBlocksCollections)(db);
    console.log('Getting blocks....');
    let res = await (0, _CheckBlocks.checkBlocksCongruence)(Blocks);
    console.log(JSON.stringify(res, null, 2));
    if (checkTxs) {
      res.missingTxs = await (0, _CheckBlocks.checkBlocksTransactions)(Blocks, Txs);

      res.missingTotal = res.missing.length;
      res.invalidTotal = res.invalid.length;
      res.missingTxsTotal = res.missingTxs.length;

      console.log(`Missing Blocks: ${res.missingTotal}`);
      console.log(`Invalid Blocks: ${res.invalidTotal}`);
      console.log(`Blocks with missing txs: ${res.missingTxsTotal} `);
    }
    if (out > 1) {
      const outFile = `${outDir}/blocksLog-${Date.now()}.json`;
      await writeFile(outFile, JSON.stringify(res));
      console.log(`Log saved on: ${outFile} `);
    }
    process.exit(0);
  } catch (err) {
    console.log(err);
    process.exit(9);
  }
});
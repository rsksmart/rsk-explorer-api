'use strict';var _dataSource = require('../lib/dataSource.js');var _dataSource2 = _interopRequireDefault(_dataSource);
var _config = require('../lib/config');var _config2 = _interopRequireDefault(_config);
var _fs = require('fs');var _fs2 = _interopRequireDefault(_fs);
var _util = require('util');var _util2 = _interopRequireDefault(_util);
var _CheckBlocks = require('../services/classes/CheckBlocks');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const config = Object.assign({}, _config2.default.blocks);
const writeFile = _util2.default.promisify(_fs2.default.writeFile);
const outFile = process.argv[2] || '/tmp/blocksLog.json';
_dataSource2.default.then(async db => {
  try {
    const Blocks = db.collection(config.collections.Blocks);
    console.log('Getting blocks....');
    let res = await (0, _CheckBlocks.checkBlocksCongruence)(Blocks);
    res.missingTxs = await (0, _CheckBlocks.checkBlocksTransactions)(Blocks);

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
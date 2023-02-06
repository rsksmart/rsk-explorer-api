"use strict";
var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _Block = require("../services/classes/Block");
var _BlocksBase = _interopRequireDefault(require("../lib/BlocksBase"));
var _BlockSummary = require("../services/classes/BlockSummary");
var _token = require("../repositories/token.repository");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

update().then(addresses => {
  if (addresses.length) {
    console.log('Addresses:');
    console.log(JSON.stringify(addresses, null, 2));
  } else {
    console.log('There are not invalid token data');
  }
  process.exit(0);
});

async function update() {
  try {
    const addresses = {};
    const { collections, db, initConfig } = await (0, _dataSource.default)();
    const collection = collections.Addrs;
    const q = { $type: 'object' };
    const query = { $or: [{ decimals: q }, { totalSupply: q }] };
    const project = { address: 1, name: 1, blockNumber: 1 };
    const cursor = _token.tokenRepository.find(query, project, collection);

    while (await cursor.hasNext()) {
      let { address, name, blockNumber } = await cursor.next();
      addresses[address] = { address, name };
      console.log(`Address: ${address}, name:${name}`);
      let summaries = await (0, _BlockSummary.getBlockSummariesByNumber)(blockNumber, collections);
      summaries = summaries.map(({ hash }) => hash);
      console.log(`Removing block summaries for block ${blockNumber}`);
      await Promise.all([...summaries.map(hash => (0, _BlockSummary.deleteBlockSummaryFromDb)(hash, collections))]);
      console.log(`Deleting block ${blockNumber} from db`);
      await Promise.all([...summaries.map(hash => (0, _Block.deleteBlockDataFromDb)(hash, blockNumber, collections))]);
      console.log(`Getting block ${blockNumber}`);
      let block = new _Block.Block(blockNumber, new _BlocksBase.default(db, { initConfig }));
      await block.save();
    }
    return Object.values(addresses);
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
}
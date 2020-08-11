"use strict";var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _Address = require("../services/classes/Address");
var _nod3Connect = require("../lib/nod3Connect");
var _cli = require("../lib/cli");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const save = process.argv[2] === '--save';
main().then(res => {
  console.log('');
  console.log(JSON.stringify(res, null, 2));
  if (res.updated !== res.outdated) {
    console.log('----------------------------------------------------');
    console.log(`Run ${process.argv[0]} ${process.argv[1]} --save`);
    console.log('to update the balances');
    console.log('----------------------------------------------------');
  }
  process.exit(0);
});

async function main() {
  try {
    const { collections } = await (0, _dataSource.default)();
    const collection = collections.Addrs;
    const addresses = await collection.countDocuments();
    const cursor = collection.find({});
    let checked = 0;
    let updated = 0;
    let outdated = 0;
    const lastBlock = await _nod3Connect.nod3.eth.getBlock('latest');
    while (await cursor.hasNext()) {
      console.log('');

      let { address, balance } = await cursor.next();
      checked++;
      _cli.log.info(`${address} -- ${checked} / ${addresses}`);
      let newBalance = await _nod3Connect.nod3.eth.getBalance(address, 'latest');
      if (newBalance === balance) {
        _cli.log.ok(`${logTime()} The balance for ${address} is up to date`);
      } else {
        outdated++;
        if (save) {
          newBalance = await _nod3Connect.nod3.eth.getBalance(address, 'latest');
          let blockNumber = await _nod3Connect.nod3.eth.blockNumber();
          if (parseInt(blockNumber) < parseInt(lastBlock.number)) {
            throw new Error(`Invalid block number ${blockNumber}`);
          }
          _cli.log.info(`${logTime()} Updating balance of: ${address} to ${newBalance}`);
          let result = await (0, _Address.saveAddressToDb)({ address, blockNumber, balance: newBalance }, collection);
          if (!result.ok) throw new Error(`Error updating balance for ${address}`);
          updated++;
        } else {
          _cli.log.warn(`${logTime()} The balance of ${address} is outdated, balance:${balance}  newBalance:${newBalance}`);
        }
      }
    }
    return { addresses, checked, outdated, updated };
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
}

function logTime() {
  let d = new Date().toISOString();
  return `[${d}] -`;
}
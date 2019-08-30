"use strict";var _Contract = _interopRequireDefault(require("../services/classes/Contract"));
var _nod3Connect = _interopRequireDefault(require("../lib/nod3Connect"));
var _bignumber = _interopRequireDefault(require("bignumber.js"));
var _utils = require("../lib/utils");
var _dataSource = _interopRequireDefault(require("../lib/dataSource"));
var _cli = require("../lib/cli");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const contractAddress = process.argv[2];
if (!(0, _utils.isAddress)(contractAddress)) help();

const contract = new _Contract.default(contractAddress, null, _nod3Connect.default);

(0, _dataSource.default)().then(async ({ db }) => {
  const collection = db.collection('tokensAddresses');
  let accounts = await collection.find({ contract: contractAddress }).toArray();
  let { errors, totalDiff } = await updateBalances(accounts, collection);
  if (errors) {
    (0, _cli.warn)(`Total Diff:  ${totalDiff}`);
    (0, _cli.error)(JSON.stringify(errors, null, 2));
  }
  process.exit(0);
});

async function updateBalances(accounts, collection) {
  const errors = [];
  const total = accounts.length;
  let result = {};
  for (let i = 0; i < total; i++) {
    let account = accounts[i];
    let { address, balance } = account;
    let msg = `${i + 1}/${total} ${address} `;
    let Address = contract.addAddress(address);
    let newBalance = await Address.getBalance();
    newBalance = (0, _utils.add0x)(newBalance.toString(16));
    if (balance !== newBalance) {
      let difference = (0, _utils.add0x)(new _bignumber.default(newBalance).minus(new _bignumber.default(balance)).toString(16));
      const error = { address, balance, newBalance, difference };
      (0, _cli.warn)(`ERROR: ${msg}`);
      (0, _cli.warn)(`${JSON.stringify(error, null, 2)}`);
      errors.push(error);
      await collection.updateOne({ address, contract: contractAddress }, { $set: { balance: newBalance } });
    } else {
      (0, _cli.info)(msg);
    }
  }
  if (errors.length) {
    let totalDiff = (0, _utils.bigNumberSum)(errors.map(error => error.difference)).toString(16);
    result = { errors, totalDiff };
  }
  return result;
}

function help() {
  const myName = process.argv[1].split('/').pop();
  (0, _cli.info)(`Usage: ${process.argv[0]} ${myName} [address]`);
  process.exit(0);
}
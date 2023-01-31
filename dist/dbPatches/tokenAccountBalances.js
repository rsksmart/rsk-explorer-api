"use strict";
var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _nod3Connect = _interopRequireDefault(require("../lib/nod3Connect"));
var _rskContractParser = _interopRequireDefault(require("@rsksmart/rsk-contract-parser"));
var _rskUtils = require("@rsksmart/rsk-utils");
var _token = require("../repositories/token.repository");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const parser = new _rskContractParser.default({ nod3: _nod3Connect.default });

patch().then(() => {
  console.log('DONE!');
}).catch(err => {
  console.log('ERROR');
  console.log(err);
  process.exit(9);
});

async function patch() {
  try {
    let { db } = await (0, _dataSource.default)({ skipCheck: true });
    let collection = db.collection('tokensAddresses');
    let cursor = _token.tokenRepository.find({}, {}, collection);
    await cursor.forEach(async account => {
      try {
        let { balance, contract, address, _id } = account;
        let name = `${contract}--${address}`;
        if (balance !== null) {
          console.log(`Getting balance for ${name}`);
          let newBalance = await getBalance(account);
          newBalance = (0, _rskUtils.add0x)(newBalance.toString(16));
          if (balance !== newBalance) {
            console.log(`Updating balance for ${name}`);
            await _token.tokenRepository.updateOne({ _id }, { $set: { balance: newBalance } }, {}, collection);
          } else {
            console.log(`${name} .... OK`);
          }
        } else {
          console.log(`${name} has null balance, skipped`);
        }
      } catch (err) {
        console.log(err, account);
        return Promise.reject(err);
      }
    });
  } catch (err) {
    console.log(err);
    process.exit(9);
  }
}

async function getBalance({ address, contract }, { abi } = {}) {
  try {
    let Contract = parser.makeContract(contract, abi);
    let balance = await Contract.call('balanceOf', [address]);
    return balance;
  } catch (err) {
    return Promise.reject(err);
  }
}
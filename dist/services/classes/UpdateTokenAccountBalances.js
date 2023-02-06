"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.updateTokenAccountBalances = updateTokenAccountBalances;
var _rskUtils = require("@rsksmart/rsk-utils");
var _rskContractParser = _interopRequireDefault(require("@rsksmart/rsk-contract-parser"));
var _token = require("../../repositories/token.repository");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

async function updateTokenAccountBalances(block, { nod3, collections, log }) {
  const parser = new _rskContractParser.default({ nod3 });
  let { number } = block;
  number = parseInt(number) - 1;
  if (number < 1) return;
  log.trace(`Checking token account balances for block ${number}`);
  try {
    let collection = collections.TokensAddrs;
    let query = { 'block.number': number };
    let cursor = _token.tokenRepository.find(query, {}, collection, {}, 0, false);
    await cursor.forEach(async account => {
      try {
        let { balance, _id, address, contract } = account;
        let newBalance = await getBalance(account, { parser });
        if (balance !== newBalance) {
          log.info(`Updating token account balance ${contract}--${address}`);
          await _token.tokenRepository.updateOne({ _id }, { $set: { balance: newBalance } }, {}, collection);
        }
      } catch (err) {
        log.error(err);
        return Promise.reject(err);
      }
    });
  } catch (err) {
    return Promise.reject(err);
  }
}

async function getBalance({ address, contract }, { parser, abi } = {}) {
  try {
    let Contract = parser.makeContract(contract, abi);
    let balance = await Contract.call('balanceOf', [address]);
    if (balance) balance = (0, _rskUtils.add0x)(balance.toString(16));
    return balance;
  } catch (err) {
    return Promise.reject(err);
  }
}
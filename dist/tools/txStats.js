"use strict";var _dataSource = _interopRequireDefault(require("../lib/dataSource.js"));
var _blocksCollections = require("../lib/blocksCollections");
var _utils = require("../lib/utils");
var _tx = require("../repositories/tx.repository");
var _block = require("../repositories/block.repository");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const fromBlock = parseInt(process.argv[2]);
const toBlock = parseInt(process.argv[3]);
if (!fromBlock || !toBlock) help();
if (fromBlock > toBlock) help(`'fromBlock' must be less than 'toBlock'`);

const DATA = {
  txs: 0,
  gas: (0, _utils.newBigNumber)(0),
  gasPrice: (0, _utils.newBigNumber)(0),
  gasUsed: (0, _utils.newBigNumber)(0),
  fee: (0, _utils.newBigNumber)(0) };

const accounts = {};

console.log(`from block: ${fromBlock} to block: ${toBlock}`);
getData(fromBlock, toBlock);

async function getData(fromBlock, toBlock) {
  try {
    let { db } = await (0, _dataSource.default)();
    let collections = (0, _blocksCollections.getDbBlocksCollections)(db);
    let { Txs } = collections;
    let query = {
      $and: [
      { blockNumber: { $gte: fromBlock } },
      { blockNumber: { $lte: toBlock } },
      { txType: { $ne: 'remasc' } }] };

    let cursor = _tx.txRepository.find(query, {}, Txs);
    DATA.txs = await _tx.txRepository.countDocuments(query, Txs);

    await cursor.forEach(tx => {
      getTxData(tx);
    });
    printObj(DATA);
    printObj(accounts);
    console.log(`Accounts that sent txs: ${Object.keys(accounts).length}`);

    let fb = await getBlock(collections, fromBlock);
    let tb = await getBlock(collections, toBlock);
    let diff = getDiff(fb, tb);

    printObj(diff);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(9);
  }
}

async function getBlock({ Blocks }, number) {
  try {
    let query = { number };
    let data = await _block.blockRepository.findOne(query, {}, Blocks);
    return data;
  } catch (err) {
    return Promise.reject(err);
  }
}

function getTxData(tx) {
  let { gas, gasPrice, receipt, from } = tx;
  let fromTxs = accounts[from] || 0;
  accounts[from] = fromTxs + 1;
  let { gasUsed } = receipt;
  gas = (0, _utils.newBigNumber)(gas);
  gasPrice = toWei(gasPrice);
  gasUsed = (0, _utils.newBigNumber)(gasUsed);
  let fee = gasUsed.multipliedBy(gasPrice);
  DATA.gas = DATA.gas.plus(gas);
  DATA.gasPrice = DATA.gasPrice.plus(gasPrice);
  DATA.gasUsed = DATA.gasUsed.plus(gasUsed);
  DATA.fee = DATA.fee.plus(fee);
}

function getDiff(from, to) {
  let time = to.timestamp - from.timestamp;
  let difficulty = (0, _utils.newBigNumber)(to.totalDifficulty).minus((0, _utils.newBigNumber)(from.totalDifficulty));
  let hashrate = difficulty.dividedBy((0, _utils.newBigNumber)(time));
  return { time, difficulty, hashrate };
}

function help(msg) {
  if (msg) console.error(`ERROR: ${msg}`);
  const myName = process.argv[1].split('/').pop();
  console.log('');
  console.log(`Usage:`);
  console.log(`node ${myName} [fromBlock] [toBlock]`);
  console.log(`Example: node ${myName} 100 200`);
  console.log('');
  process.exit(0);
}

function toWei(value) {
  return (0, _utils.newBigNumber)(value).dividedBy((0, _utils.newBigNumber)(10 ** 18));
}

function printObj(obj) {
  let o = Object.assign({}, obj);
  for (let p in o) {
    o[p] = o[p].toString(10);
  }
  console.log(JSON.stringify(o, null, 2));
}
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.MissingBalances = MissingBalances;exports.default = exports.UpdateBlockBalances = void 0;var _BlocksBase = require("../../lib/BlocksBase");
var _BlockBalances = require("./BlockBalances");
var _BlockSummary = require("./BlockSummary");
var _utils = require("../../lib/utils");
var _InternalTx = require("./InternalTx");
var _balancesLog = require("../../repositories/balancesLog.repository");
var _block = require("../../repositories/block.repository");
var _balances = require("../../repositories/balances.repository");

class UpdateBlockBalances extends _BlocksBase.BlocksBase {
  constructor(db, { log, initConfig, nod3, debug, confirmations }) {
    super(db, { log, initConfig, nod3, debug });
    confirmations = parseInt(confirmations);
    this.confirmations = !isNaN(confirmations) ? confirmations : 120;
    this.lastBlock = { number: undefined };
    let { Blocks, Balances, BalancesLog } = this.collections;
    this.blocksCollection = Blocks;
    this.balancesCollection = Balances;
    this.balancesLogCollection = BalancesLog;
    this.missing = undefined;
    this.started = undefined;
  }

  async updateLogBalance(blockHash) {
    try {
      if (!(0, _utils.isBlockHash)(blockHash)) throw new Error(`Invalid blockHash: ${blockHash}`);
      let _created = Date.now();
      let result = await _balancesLog.balancesLogRepository.insertOne({ blockHash, _created }, this.balancesLogCollection);
      return result;
    } catch (err) {
      if (err.code === 11000) return Promise.resolve();else
      return Promise.reject(err);
    }
  }
  getLogBalance(blockHash) {
    return _balancesLog.balancesLogRepository.findOne({ blockHash }, {}, this.balancesLogCollection);
  }

  async updateBalance(blockHash) {
    try {
      let isChecked = await this.getLogBalance(blockHash);
      if (isChecked) {
        this.log.debug(`Block balance ${blockHash} skipped`);
        return;
      }
      let { nod3, log, collections, initConfig } = this;
      let summary = await (0, _BlockSummary.getBlockSummaryFromDb)(blockHash, collections);
      if (!summary) throw new Error(`Missing block summary: ${blockHash}`);
      const { block, internalTransactions } = summary.data;
      const { number } = block;
      const addresses = (0, _InternalTx.filterValueAddresses)(internalTransactions);
      let blockBalances = new _BlockBalances.BlockBalances({ block, addresses }, { nod3, log, collections, initConfig });
      let result = await blockBalances.save();
      blockBalances = undefined;
      await this.updateLogBalance(blockHash);
      this.log.info(`The balances of block: ${blockHash}/${number} were updated`);
      return result;
    } catch (err) {
      this.log.error(`Error updating balances of ${blockHash}`);
      return Promise.reject(err);
    }
  }

  createMissingBalances() {
    let { lastBlock, blocksCollection, balancesCollection, confirmations } = this;
    let { number } = lastBlock;
    let highestBlock = number > confirmations ? number - confirmations : number;
    return MissingBalances(blocksCollection, balancesCollection, { highestBlock });
  }

  async updateLastBlock(block, skipStart = false) {
    try {
      const { lastBlock, confirmations } = this;
      const { number, hash } = block;
      if (isNaN(parseInt(number))) throw new Error(`Invalid block number: ${number}`);
      if (!(0, _utils.isBlockHash)(hash)) throw new Error(`invalid block hash: ${hash}`);
      if (!lastBlock.number || number > lastBlock.number + confirmations) {
        this.log.info(`Last block ${number}/${hash}`);
        this.lastBlock = block;
        let missing = await this.createMissingBalances();
        this.missing = missing;
        if (skipStart !== true) this.start();
        return true;
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async getNextBalances() {
    try {
      let { missing } = this;
      if (!missing) throw new Error('Missing balances generator is undefined');
      let next = await missing.next();
      if (!next) {
        this.started = false;
        return this.start();
      }
      let { hash, number } = next;
      this.log.info(`Updating balances for block ${hash} / ${number}`);
      await this.updateBalance(hash).catch(err => {
        this.log.trace(err);
      });
      return this.getNextBalances();
    } catch (err) {
      this.started = undefined;
      return Promise.reject(err);
    }
  }

  async start() {
    try {
      if (this.started) return this.started;
      if (!this.emit) throw new Error('Set emitter before start');
      let { blocksCollection } = this;
      let lastBlock = await getLastBlock(blocksCollection);
      if (lastBlock) await this.updateLastBlock(lastBlock, true);
      this.started = this.getNextBalances();
      return this.started;
    } catch (err) {
      this.log.error(err);
      return Promise.reject(err);
    }
  }}exports.UpdateBlockBalances = UpdateBlockBalances;


async function MissingBalances(blocksCollection, balancesCollection, { highestBlock, lowestBlock } = {}) {
  try {
    lowestBlock = lowestBlock || 1;
    if (!highestBlock) {
      let lastBlock = await getLastBlock(blocksCollection);
      highestBlock = lastBlock.number;
    }

    const projection = { _id: 0, number: 1, hash: 1 };
    const sort = { number: -1 };

    let currentBlock = highestBlock;
    let block;
    const current = () => currentBlock;
    const query = { number: { $lt: highestBlock, $gt: lowestBlock - 1 } };
    const cursor = _block.blockRepository.find(query, projection, blocksCollection, sort, 0, false);
    const next = async () => {
      if (currentBlock <= lowestBlock) return;

      while (await cursor.hasNext()) {
        block = await cursor.next();
        let { hash: blockHash, number } = block;
        let balance = await _balances.balancesRepository.findOne({ blockHash }, {}, balancesCollection);
        currentBlock = number;
        if (!balance) break;
      }
      return block;
    };
    return Object.freeze({ next, current });
  } catch (err) {
    return Promise.reject(err);
  }
}

function getLastBlock(blocksCollection) {
  return _block.blockRepository.findOne({}, { sort: { number: -1 } }, blocksCollection);
}var _default =

UpdateBlockBalances;exports.default = _default;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.BlockBalances = void 0;var _BcThing = require("./BcThing");
var _utils = require("../../lib/utils");
var _balances = require("../../repositories/balances.repository");

class BlockBalances extends _BcThing.BcThing {
  constructor({ block, addresses }, { nod3, collections, log, initConfig }) {
    let { number, hash, timestamp } = block;
    if (!Array.isArray(addresses)) throw new Error('addresses must be an array');
    if (!(0, _utils.isBlockHash)(hash)) throw new Error(`Invalid blockHash: ${hash}`);
    if (!(0, _utils.isValidBlockNumber)(number)) throw new Error(`Invalid block number: ${number}`);
    if (!timestamp) throw new Error('invalid block timestamp');
    super({ nod3, collections, initConfig, log });
    this.blockHash = hash;
    this.blockNumber = number;
    this.timestamp = timestamp;
    let { isAddress } = this;
    this.addresses = [...new Set(addresses)].filter(address => isAddress(address));
    this.balances = undefined;
    this.collection = this.collections.Balances;
  }
  async fetch() {
    try {
      if (this.balances) return this.balances;
      let { addresses, blockHash, blockNumber, timestamp, nod3 } = this;
      const balances = [];
      for (let address of addresses) {
        let balance = await nod3.eth.getBalance(address, blockNumber);
        balance = parseInt(balance) ? balance : 0;
        let _created = Date.now();
        balances.push({ address, balance, blockHash, blockNumber, timestamp, _created });
      }
      this.balances = balances;
      return this.balances;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  deleteOldBalances() {
    const { blockHash, blockNumber, collection } = this;
    return Promise.all([_balances.balancesRepository.deleteMany({ blockHash }, collection), _balances.balancesRepository.deleteMany({ blockNumber }, collection)]);
  }
  async save() {
    try {
      let balances = await this.fetch();
      if (!balances.length) {
        let { blockHash, blockNumber } = this;
        this.log.info(`No balances for ${blockHash} /  ${blockNumber}`);
        return;
      }
      await this.deleteOldBalances();
      let result = await _balances.balancesRepository.insertMany(balances, this.collection);
      return result;
    } catch (err) {
      return Promise.reject(err);
    }
  }}exports.BlockBalances = BlockBalances;var _default =


BlockBalances;exports.default = _default;
"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = exports.Address = void 0;var _BcThing = require("./BcThing");
var _GetTxBalance = require("./GetTxBalance");
var _utils = require("../../lib/utils");
var _types = require("../../lib/types");

class Address extends _BcThing.BcThing {
  constructor(address, { nod3, initConfig, db, collections, block = 'latest' } = {}) {
    super({ nod3, initConfig, collections });
    if (!this.isAddress(address)) throw new Error(`Invalid address: ${address}`);
    this.address = address;
    this.db = db || this.collections.Addrs;
    this.codeIsSaved = false;
    this.TxsBalance = new _GetTxBalance.GetTxBalance(this.collections.Txs);
    this.data = new Proxy(
    { address, type: _types.addrTypes.ADDRESS },
    {
      set(obj, prop, val) {
        if (prop === 'code') {
          val = val || null;
          if (!(0, _utils.isNullData)(val)) {
            obj.type = _types.addrTypes.CONTRACT;
            obj.code = val;
          }
        } else if (val && prop === _types.fields.LAST_BLOCK_MINED) {
          const lastBlock = obj[_types.fields.LAST_BLOCK_MINED] || {};
          let number = lastBlock.number || -1;
          if (val.miner === obj.address && val.number > number) {
            obj[prop] = Object.assign({}, val);
          }
        } else {
          obj[prop] = val;
        }
        return true;
      } });

    this.block = 'latest';
    this.dbData = null;
    this.setBlock(block);
  }

  setBlock(block) {
    if (!block) block = 'latest';
    if ((0, _utils.isBlockObject)(block)) {
      this.block = block.number;
      this.setLastBlock(block);
    }
  }

  setLastBlock(block) {
    this.setData(_types.fields.LAST_BLOCK_MINED, block);
  }

  setData(prop, value) {
    if (prop === 'address') return;
    this.data[prop] = value;
  }

  getBalance() {
    return this.nod3.eth.getBalance(this.address, 'latest'); // rskj 1.0.1 returns 500 with blockNumbers
  }

  getCode() {
    return this.nod3.eth.getCode(this.address, 'latest'); // rskj 1.0.1 returns 500 with blockNumbers
  }

  async fetch() {
    try {
      let balance = await this.getBalance().
      catch(err => {
        throw new Error(`Address: error getting balance of ${this.address} ${err}`);
      });
      balance = balance || 0;
      this.data.balance = balance;

      let code = null;
      let dbData = await this.getFromDb();
      this.dbData = dbData;

      if (dbData) {
        if (dbData.code) {
          code = dbData.code;
          this.codeIsSaved = true;
        }
        // Update lastBlockMined to highest block number
        this.setData(_types.fields.LAST_BLOCK_MINED, dbData[_types.fields.LAST_BLOCK_MINED]);
      }

      if (undefined === code || code === null) {
        code = await this.getCode();
      }
      this.data.code = code;
      const { nativeContracts } = this;
      if (nativeContracts) {
        const isNative = this.nativeContracts.isNativeContract(this.address);
        if (isNative) {
          this.data.isNative = true;
          this.data.name = this.nativeContracts.getNativeContractName(this.address);
          this.data.type = _types.addrTypes.CONTRACT;
        }
      }
      return this.getData();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  getFromDb() {
    return this.db.findOne({ address: this.address });
  }
  getData(serialize) {
    let data = Object.assign(this.data);
    if (this.codeIsSaved) delete data.code;
    return serialize ? this.serialize(data) : data;
  }
  async save() {
    try {
      const data = this.getData(true);
      let res = await this.update(data);
      return res;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async updateTxBalance() {
    try {
      let txBalance = await this.getBalanceFromTxs();
      if (txBalance) this.setData('txBalance', txBalance);
      return txBalance;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  resetTxBalance() {
    this.setData('txBalance', '0x00');
  }
  update(data) {
    let address = data.address || this.address;
    return this.db.updateOne({ address }, { $set: data }, { upsert: true });
  }

  async getBalanceFromTxs() {
    let address = this.address;
    try {
      let balance = await this.TxsBalance.getBalanceFromTx(address);
      if (balance) return this.serialize(balance);
    } catch (err) {
      return Promise.reject(err);
    }
  }}exports.Address = Address;var _default =


Address;exports.default = _default;
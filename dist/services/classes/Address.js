'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Address = undefined;var _BcThing = require('./BcThing');
var _GetTxBalance = require('./GetTxBalance');

class Address extends _BcThing.BcThing {
  constructor(address, { nod3, db, collections, block = 'latest' } = {}) {
    super(nod3, collections);
    if (!this.isAddress(address)) throw new Error(`Invalid address: ${address}`);
    this.address = address;
    this.db = db || this.collections.Addrs;
    this.codeIsSaved = false;
    this.TxsBalance = new _GetTxBalance.GetTxBalance(this.collections.Txs);
    this.data = new Proxy(
    { address, type: 'account' }, {
      set(obj, prop, val) {
        if (prop === 'code') {
          val = val || null;
          if (val && val !== '0x00') {
            obj.type = 'contract';
            obj.code = val;
          }
        } else {
          obj[prop] = val;
        }
        return true;
      } });

    this.block = block;
    this.dbData = null;
  }

  setData(prop, value) {
    if (prop === 'address') return;
    this.data[prop] = value;
  }

  getBalance() {
    return this.nod3.eth.getBalance(this.address, this.block);
  }

  getCode() {
    return this.nod3.eth.getCode(this.address, this.block);
  }

  async fetch() {
    let balance = await this.getBalance().
    catch(err => {
      return new Error(`Address: error getting balance of ${this.address} ${err}`);
    });
    balance = balance || 0;
    this.data.balance = balance;

    let code = null;
    let dbData = await this.getFromDb();
    this.dbData = dbData;

    if (dbData && dbData.code) {
      code = dbData.code;
      this.codeIsSaved = true;
    }

    if (undefined === code || code === null) {
      code = await this.getCode();
    }
    this.data.code = code;
    return this.getData();
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
    this.setData('txBalance', '0x0');
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
  }}exports.Address = Address;exports.default =


Address;
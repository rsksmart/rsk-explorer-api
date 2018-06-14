'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Address = undefined;var _BcThing = require('./BcThing');
class Address extends _BcThing.BcThing {
  constructor(address, web3, db, block = 'latest') {
    super(web3);
    if (!this.isAddress(address)) throw new Error(`Invalid address: ${address}`);
    this.address = address;
    this.db = db;
    this.codeIsSaved = false;
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
  }

  setData(prop, value) {
    if (prop === 'address') return;
    this.data[prop] = value;
  }
  getBalance() {
    return new Promise((resolve, reject) => {
      this.web3.eth.getBalance(this.address, this.block, (err, balance) => {
        if (err !== null) return reject(err);else
        resolve(balance);
      });
    });
  }

  getCode() {
    return new Promise((resolve, reject) => {
      this.web3.eth.getCode(this.address, this.block, (err, code) => {
        if (err !== null) return reject(err);else
        return resolve(code);
      });
    });
  }
  async fetch() {
    let balance = await this.getBalance().
    catch(err => {
      console.log(`Address: error getting balance of ${this.address} ${err}`);
    });
    balance = balance || null;
    this.data.balance = balance;

    let code = null;
    let dbData = await this.getFromDb();

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
  getData() {
    let data = Object.assign(this.data);
    if (this.codeIsSaved) delete data.code;
    return data;
  }}exports.Address = Address;exports.default =


Address;
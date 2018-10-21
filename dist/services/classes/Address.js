'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Address = undefined;var _BcThing = require('./BcThing');
class Address extends _BcThing.BcThing {
  constructor(address, nod3, db, block = 'latest') {
    super(nod3);
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
  save() {
    const a = this.getData(true);
    return this.db.updateOne({ address: a.address }, { $set: a }, { upsert: true });
  }}exports.Address = Address;exports.default =


Address;
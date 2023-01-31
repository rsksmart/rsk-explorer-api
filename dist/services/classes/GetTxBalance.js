"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.GetTxBalance = void 0;var _utils = require("../../lib/utils");
var _tx = require("../../repositories/tx.repository");
class GetTxBalance {
  constructor(txCollection) {
    this.txCollection = txCollection;
  }

  async getTxs(query) {
    let data = await _tx.txRepository.find(query, { value: 1 }, this.txCollection).
    catch(err => Promise.reject(err));
    return data;
  }

  sumValues(values) {
    return (0, _utils.bigNumberSum)(values.map(v => v.value));
  }

  async getBalanceFromTx(address) {
    try {
      const to = await this.getTxs({ to: address });
      const fr = await this.getTxs({ from: address });
      return this.sumValues(to).minus(this.sumValues(fr));
    } catch (err) {
      return Promise.reject(err);
    }
  }}exports.GetTxBalance = GetTxBalance;
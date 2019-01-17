'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.GetTxBalance = undefined;var _bignumber = require('bignumber.js');

const GetTxBalance = exports.GetTxBalance = Tx => {
  function getTxs(query) {
    return Tx.db.find(query, {}).
    project({ value: 1 }).
    toArray().
    then(data => {return data;});
  }

  function sumValues(values) {
    let total = new _bignumber.BigNumber(0);
    values.
    map(v => v.value).
    forEach(value => {
      total = total.plus(new _bignumber.BigNumber(value));
    });
    return total;
  }

  async function getBalanceFromTx(address) {
    const to = await getTxs({ to: address });
    const fr = await getTxs({ from: address });
    return sumValues(to).minus(sumValues(fr));
  }
  return getBalanceFromTx;
};
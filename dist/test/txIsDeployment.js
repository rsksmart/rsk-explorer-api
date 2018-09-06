'use strict';var _txFormat = require('../lib/txFormat');

const isDeployment = tx => {
  tx = (0, _txFormat.txFormat)(tx);
  return tx.txType === _txFormat.cfg.txTypes.contract;
};

const test = values => {
  for (let contractAddress of values) {
    console.log(contractAddress, isDeployment({ receipt: { contractAddress } }));
  }
};

const values = [null,
0,
'',
false,
undefined,
0x00,
'0x00',
0x0000000000000000000000000000000000000000,
0x0000000000000000000000000000000001000008,
0x010ae5e7f9a4dd7fb64d9f222e35db1a09036eaf,
'0x010ae5e7f9a4dd7fb64d9f222e35db1a09036eaf'];

test(values);
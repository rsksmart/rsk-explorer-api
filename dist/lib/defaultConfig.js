'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 *  This file provides default values,
 *  use /config.json, to overwrite settings
 */

exports.default = {
  server: {
    port: 3003
  },
  source: {
    node: 'localhost',
    port: 4444
  },
  log: {
    dir: "/var/log/rsk-explorer"
  },
  db: {
    server: 'localhost',
    port: 27017,
    database: 'blockDB'
  },
  api: {
    lastBlocks: 10,
    perPage: 50

  },
  publicSettings: {
    bridgeAddress: '0x0000000000000000000000000000000001000006',
    remascAddress: '0x0000000000000000000000000000000001000008',
    contractDeployAddress: '0x0000000000000000000000000000000000000000'
  },
  blocks: {
    blocksQueueSize: 30,
    blocksCollection: 'blocks',
    txCollection: 'transactions',
    addrCollection: 'addresses',
    statsCollection: 'stats'
  },
  erc20: {
    dbPrefix: 'erc20_',
    tokenCollection: 'erc20Tokens',
    logFormat: 'combined',
    exportStartBlock: 0,
    exportEndBlock: 'latest',
    abi: [{
      constant: false,
      inputs: [{ name: '_spender', type: 'address' }, { name: '_value', type: 'uint256' }],
      name: 'approve',
      outputs: [{ name: 'success', type: 'bool' }],
      payable: false,
      type: 'function'
    }, {
      constant: true,
      inputs: [],
      name: 'totalSupply',
      outputs: [{ name: 'totalSupply', type: 'uint256' }],
      payable: false,
      type: 'function'
    }, {
      constant: false,
      inputs: [{ name: '_from', type: 'address' }, { name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }],
      name: 'transferFrom',
      outputs: [{ name: 'success', type: 'bool' }],
      payable: false,
      type: 'function'
    }, {
      constant: true,
      inputs: [{ name: '_owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: 'balance', type: 'uint256' }],
      payable: false,
      type: 'function'
    }, {
      constant: false,
      inputs: [{ name: '_to', type: 'address' }, { name: '_value', type: 'uint256' }],
      name: 'transfer',
      outputs: [{ name: 'success', type: 'bool' }],
      payable: false,
      type: 'function'
    }, {
      constant: true,
      inputs: [{ name: '_owner', type: 'address' }, { name: '_spender', type: 'address' }],
      name: 'allowance',
      outputs: [{ name: 'remaining', type: 'uint256' }],
      payable: false,
      type: 'function'
    }, {
      anonymous: false,
      inputs: [{ indexed: true, name: '_from', type: 'address' }, { indexed: true, name: '_to', type: 'address' }, { indexed: false, name: '_value', type: 'uint256' }],
      name: 'Transfer',
      type: 'event'
    }, {
      anonymous: false,
      inputs: [{ indexed: true, name: '_owner', type: 'address' }, { indexed: true, name: '_spender', type: 'address' }, { indexed: false, name: '_value', type: 'uint256' }],
      name: 'Approval',
      type: 'event'
    }]
  }
};
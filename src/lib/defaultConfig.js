/**
 *  This file provides default values,
 *  use /config.json, to overwrite settings
 */

export default {
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
    log: {},
    lastBlocks: 50,
    perPage: 50

  },
  blocks: {
    log: {},
    blocksQueueSize: 30,
    blocksCollection: 'blocks',
    txCollection: 'transactions',
    accountsCollection: 'accounts'
  },
  erc20: {
    log: {},
    dbPrefix: 'erc20_',
    tokenCollection: 'erc20Tokens',
    logFormat: 'combined',
    exportStartBlock: 0,
    exportEndBlock: 'latest',
    erc20ABI: [
      {
        constant: false,
        inputs: [
          { name: '_spender', type: 'address' },
          { name: '_value', type: 'uint256' }
        ],
        name: 'approve',
        outputs: [{ name: 'success', type: 'bool' }],
        payable: false,
        type: 'function'
      },
      {
        constant: true,
        inputs: [],
        name: 'totalSupply',
        outputs: [{ name: 'totalSupply', type: 'uint256' }],
        payable: false,
        type: 'function'
      },
      {
        constant: false,
        inputs: [
          { name: '_from', type: 'address' },
          { name: '_to', type: 'address' },
          { name: '_value', type: 'uint256' }
        ],
        name: 'transferFrom',
        outputs: [{ name: 'success', type: 'bool' }],
        payable: false,
        type: 'function'
      },
      {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        payable: false,
        type: 'function'
      },
      {
        constant: false,
        inputs: [
          { name: '_to', type: 'address' },
          { name: '_value', type: 'uint256' }
        ],
        name: 'transfer',
        outputs: [{ name: 'success', type: 'bool' }],
        payable: false,
        type: 'function'
      },
      {
        constant: true,
        inputs: [
          { name: '_owner', type: 'address' },
          { name: '_spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: 'remaining', type: 'uint256' }],
        payable: false,
        type: 'function'
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: '_from', type: 'address' },
          { indexed: true, name: '_to', type: 'address' },
          { indexed: false, name: '_value', type: 'uint256' }
        ],
        name: 'Transfer',
        type: 'event'
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: '_owner', type: 'address' },
          { indexed: true, name: '_spender', type: 'address' },
          { indexed: false, name: '_value', type: 'uint256' }
        ],
        name: 'Approval',
        type: 'event'
      }
    ]
  }
}

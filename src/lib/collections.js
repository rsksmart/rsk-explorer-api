export default {
  Blocks: [
    {
      key: { number: -1 },
      unique: true,
      name: 'blockNumber'
    },
    {
      key: { hash: 1 },
      unique: true
    },
    {
      key: { timestamp: -1 },
      name: 'blocksTimestamp'
    },
    {
      key: { miner: 1 },
      name: 'blocksMiner'
    },
    {
      key: { txs: 1 },
      name: 'blocksTxs'
    },
    {
      key: { size: 1 },
      name: 'blocksSize'
    },
    {
      key: { _received: -1 },
      name: 'blockReceivedTime'
    }
  ],
  Txs: [
    {
      key: { hash: 1 },
      unique: true
    },
    {
      key: { blockNumber: -1 },
      name: 'txBlockNumberIndex'
    },
    {
      key: { blockHash: 1 },
      name: 'txBlockHashIndex'
    },
    {
      key: { from: 1 },
      name: 'fromIndex'
    },
    {
      key: { to: 1 },
      name: 'toIndex'
    },
    {
      key: { txType: 1 },
      name: 'txTypeIndex'
    }
  ],
  Addrs: [
    {
      key: { address: 1 },
      unique: true
    },
    {
      key: { balance: 1 },
      name: 'balanceIndex'
    },
    {
      key: { type: 1 },
      name: 'addTypeIndex'
    },
    {
      key: { name: 1 },
      name: 'addressNameIndex'
    }
  ],
  Status: [
    {
      key: { timestamp: -1 },
      partialFilterExpression: {
        timestamp: { $exists: true }
      }
    }
  ],
  Events: [
    {
      key: { address: 1 },
      name: 'eventAddressIndex'
    },
    {
      key: { event: 1 },
      name: 'eventEvIndex'
    },
    {
      key: { timestamp: 1 },
      name: 'eventTsIndex'
    },
    {
      key: { blockNumber: 1 },
      name: 'eventBlockNumberIndex'
    }
  ],
  TokensAddrs: [
    {
      key: {
        address: 1,
        contract: 1
      },
      unique: true
    },
    {
      key: { address: 1 },
      name: 'addressIndx'
    },
    {
      key: { contract: 1 },
      name: 'contractIndx'
    }

  ],
  OrphanBlocks: [
    {
      key: {
        hash: 1
      },
      unique: true
    }
  ],
  TxPool: [
    {
      key: {
        timestamp: -1
      }
    }
  ],
  PendingTxs: [
    {
      key: {
        hash: 1
      },
      unique: true
    },
    {
      key: { from: 1 },
      name: 'pendingTxFrom'
    },
    {
      key: { to: 1 },
      name: 'pendingTxTo'
    }
  ]
}

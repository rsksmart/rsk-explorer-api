export default {
  Config: {
    indexes: []
  },
  Blocks: {
    indexes: [
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
    ]
  },
  BlocksSummary: {
    indexes: [
      {
        key: { hash: 1 },
        unique: true
      },
      {
        key: { number: -1 }
      },
      {
        key: { timestamp: -1 }
      }
    ]
  },
  Txs: {
    indexes: [
      {
        key: { txId: -1 },
        unique: true
      },
      {
        key: { hash: 1 },
        unique: true
      },
      {
        key: { blockNumber: -1 },
        name: 'txBlockNumberIndex'
      },
      {
        key: { transactionIndex: -1 },
        name: 'txIndex'
      },
      {
        key: { blockHash: 1 },
        name: 'txBlockHashIndex'
      },
      {
        key: { timestamp: -1 },
        name: 'txTime'
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
    ]
  },
  Addrs: {
    indexes: [
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
      },
      {
        key: { 'createdByTx.timestamp': -1 },
        name: 'contractCreated'
      },
      {
        key: { name: 'text' },
        name: 'addrTextIndex'
      }
    ]
  },
  Status: {
    options: {
      capped: true,
      size: 262144,
      max: 100
    },
    indexes: [
      {
        key: { timestamp: -1 },
        partialFilterExpression: {
          timestamp: { $exists: true }
        }
      }
    ]
  },
  Events: {
    indexes: [
      {
        key: { eventId: -1 },
        unique: true
      },
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
      },
      {
        key: { txHash: 1 },
        name: 'eventTxHashIndex'
      },
      {
        key: { blockHash: 1 },
        name: 'eventBlockHashIndex'
      },
      {
        key: { signature: 1 },
        name: 'eventSignatureIndex'
      },
      {
        key: { _addresses: 1 },
        name: 'eventAddressesIndex'
      }
    ]
  },
  TokensAddrs: {
    indexes: [
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

    ]
  },
  OrphanBlocks: {
    indexes: [
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
    ]
  },
  PendingTxs: {
    indexes: [
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
  },
  Stats: {
    indexes: [
      {
        key: { timestamp: 1 },
        name: 'statsTime'
      },
      {
        key: { blockNumber: -1 },
        name: 'statsBlockNumber'
      }
    ]
  },
  ContractVerification: {
    indexes: [
      {
        key: { address: 1 }
      }
    ]
  },
  VerificationsResults: {
    indexes: [
      {
        key: { address: 1 }
      },
      {
        key: { match: 1 }
      }
    ]
  }
}

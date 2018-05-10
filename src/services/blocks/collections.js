// order matters
export default {
  blocksCollection: [
    {
      key: { number: 1 },
      unique: true
    },
    {
      key: { timestamp: 1 },
      name: 'blocksTime'
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
    }
  ],
  txCollection: [
    {
      key: { hash: 1 },
      unique: true
    },
    {
      key: {
        blockNumber: 1,
        transactionIndex: 1
      },
      name: 'blockTrasaction'
    },
    {
      key: { blockNumber: 1 },
      name: 'blockIndex'
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
      key: { value: 1 },
      name: 'valueIndex'
    },
    {
      key: { timestamp: 1 },
      name: 'timeIndex'
    }
  ],
  addrCollection: [
    {
      key: { address: 1 },
      unique: true
    },
    {
      key: { balance: 1 },
      name: 'balanceIndex'
    }
  ],
  statusCollection: [
    {
      key: { timestamp: 1 },
      unique: true
    }
  ]
}
import {prismaClient} from '../lib/Setup'

export const blockTraceRepository = {
  findOne (query = {}, project = {}, collection) {
    return collection.findOne(query, project)
  },
  async insertOne (internalTransactions, collection) {
    const upsertQueries = internalTransactions.map(({blockHash, internalTxId}) => {
      const tracedItxToSave = { blockHash, internalTxId }

      return prismaClient.block_trace.upsert({ where: { blockHash_internalTxId: tracedItxToSave }, create: tracedItxToSave, update: {} })
    })

    await prismaClient.$transaction(upsertQueries)

    if (internalTransactions.length) {
      const {blockHash: hash} = internalTransactions[0]

      await collection.insertOne({ hash, data: internalTransactions })
    }
  }
}

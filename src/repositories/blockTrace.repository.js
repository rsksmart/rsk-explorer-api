import {prismaClient} from '../lib/Setup'

export const blockTraceRepository = {
  async insertOne (internalTransactions, collection) {
    const upsertQueries = internalTransactions.map(({blockHash, internalTxId}) => {
      const tracedItxToSave = { blockHash, internalTxId }

      return prismaClient.block_trace.upsert({ where: { blockHash_internalTxId: tracedItxToSave }, create: tracedItxToSave, update: {} })
    })

    await prismaClient.$transaction(upsertQueries)
  }
}

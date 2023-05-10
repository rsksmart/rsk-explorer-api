import {prismaClient} from '../lib/Setup'

export const blockTraceRepository = {
  insertOne (internalTransactions, collection) {
    const tracesToSave = internalTransactions.map(itx => ({ blockHash: itx.blockHash, internalTxId: itx.internalTxId }))

    return [prismaClient.block_trace.createMany({ data: tracesToSave, skipDuplicates: true })]
  }
}

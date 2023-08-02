import { addressRepository } from './address.repository'
import { balancesRepository } from './balances.repository'
import { blockRepository } from './block.repository'
import { blockTraceRepository } from './blockTrace.repository'
import { eventRepository } from './event.repository'
import { internalTxRepository } from './internalTx.repository'
import { summaryRepository } from './summary.repository'
import { statsRepository } from './stats.repository'
import { statusRepository } from './status.repository'
import { tokenRepository } from './token.repository'
import { txRepository } from './tx.repository'
import { txPoolRepository } from './txPool.repository'

export const REPOSITORIES = {
  Address: addressRepository,
  Balances: balancesRepository,
  Block: blockRepository,
  BlockTrace: blockTraceRepository,
  Event: eventRepository,
  InternalTx: internalTxRepository,
  Stats: statsRepository,
  Status: statusRepository,
  Summary: summaryRepository,
  Token: tokenRepository,
  Tx: txRepository,
  TxPool: txPoolRepository
}

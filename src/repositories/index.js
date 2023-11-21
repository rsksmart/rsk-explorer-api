import { prismaClient } from '../lib/prismaClient'
import { getAddressRepository } from './address.repository'
import { getBalancesRepository } from './balances.repository'
import { getBlocksRepository } from './blocks.repository'
import { getBlockTraceRepository } from './blockTrace.repository'
import { getEventRepository } from './event.repository'
import { getInternalTxRepository } from './internalTx.repository'
import { getSummaryRepository } from './summary.repository'
import { getStatsRepository } from './stats.repository'
import { getStatusRepository } from './status.repository'
import { getTokenRepository } from './token.repository'
import { getTxRepository } from './tx.repository'
import { getTxPoolRepository } from './txPool.repository'
import { getTxPendingRepository } from './txPending.repository'
import { getVerificationResultsRepository } from './verificationResults.repository'
import { getContractVerificationRepository } from './contractVerification.repository'
import { getConfigRepository } from './config.repository'

export const addressRepository = getAddressRepository(prismaClient)
export const blocksRepository = getBlocksRepository(prismaClient)
export const balancesRepository = getBalancesRepository(prismaClient)
export const blockTraceRepository = getBlockTraceRepository(prismaClient)
export const eventRepository = getEventRepository(prismaClient)
export const internalTxRepository = getInternalTxRepository(prismaClient)
export const statsRepository = getStatsRepository(prismaClient)
export const statusRepository = getStatusRepository(prismaClient)
export const summaryRepository = getSummaryRepository(prismaClient)
export const tokenRepository = getTokenRepository(prismaClient)
export const txRepository = getTxRepository(prismaClient)
export const txPoolRepository = getTxPoolRepository(prismaClient)
export const txPendingRepository = getTxPendingRepository(prismaClient)
export const verificationResultsRepository = getVerificationResultsRepository(prismaClient)
export const contractVerificationRepository = getContractVerificationRepository(prismaClient)
export const configRepository = getConfigRepository(prismaClient)

export const REPOSITORIES = {
  Address: addressRepository,
  Balances: balancesRepository,
  Blocks: blocksRepository,
  BlockTrace: blockTraceRepository,
  Event: eventRepository,
  InternalTx: internalTxRepository,
  Stats: statsRepository,
  Status: statusRepository,
  Summary: summaryRepository,
  Token: tokenRepository,
  Tx: txRepository,
  TxPool: txPoolRepository,
  TxPending: txPendingRepository,
  VerificationResults: verificationResultsRepository,
  ContractVerification: contractVerificationRepository,
  Config: configRepository
}

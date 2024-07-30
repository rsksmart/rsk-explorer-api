import { getMissingSegments } from '../lib/getMissingSegments.js'
import { insertBlock } from '../lib/servicesUtils.js'
import nod3 from '../lib/nod3Connect.js'
import Logger from '../lib/Logger.js'
import { REPOSITORIES } from '../repositories/index.js'
import { getInitConfig } from '../lib/Setup.js'
import BlocksBase from '../lib/BlocksBase.js'
import { checkBlocksCongruence } from './blocksCongruenceChecker.js'

const { Blocks: blocksRepository } = REPOSITORIES

const log = Logger('[static-syncer]')

export async function staticSyncer (syncStatus, confirmationsThreshold, blocksCongruenceCheckThreshold) {
  syncStatus.staticSyncerRunning = true

  try {
    // congruence validation
    await checkBlocksCongruence(blocksCongruenceCheckThreshold, { log })

    // missing blocks
    const initConfig = await getInitConfig()
    const blocksBase = new BlocksBase({ initConfig, log })
    const blocksInDb = await blocksRepository.find({}, { number: true }, { number: 'desc' })
    const blocksNumbers = blocksInDb.map(b => b.number)
    syncStatus.connected = await nod3.isConnected()

    const { number: latestBlock } = syncStatus.latestBlock

    const missingSegments = getMissingSegments(latestBlock - confirmationsThreshold, blocksNumbers)
    const requestingBlocks = latestBlock - blocksNumbers.length
    let pendingBlocks = requestingBlocks - 1 // -1 because a status is inserted after block's insertion

    log.info('Starting sync...')
    log.info(`Missing segments: ${JSON.stringify(missingSegments, null, 2)}`)
    // iterate segments
    for (let i = 0; i < missingSegments.length; i++) {
      // topStaticSync flag is enabled from the main service due to the interval set to restart the static syncer
      await fillSegment(missingSegments[i], requestingBlocks, pendingBlocks, blocksBase, { initConfig, log }, syncStatus)
    }

    if (syncStatus.staticSyncerRunning) log.info('Finished the iteration of all missing segments.')
    syncStatus.staticSyncerRunning = false
  } catch (e) {
    log.error(e)
    log.info('Stopping static syncer due to an error.')
    syncStatus.staticSyncerRunning = false
  }
}

async function fillSegment (segment, requestingBlocks, pendingBlocks, blocksBase, { initConfig, log }, syncStatus) {
  let number = segment[0]
  const lastNumber = segment[1]
  while (number >= lastNumber) {
    try {
      const timestamp = Date.now()
      const status = {
        requestingBlocks,
        pendingBlocks,
        nodeDown: !syncStatus.connected,
        timestamp
      }

      await insertBlock(number, blocksBase, { initConfig, log }, status)
    } catch (err) {
      log.info(`There was an error saving block ${number}`)
      log.error(err)
    }
    pendingBlocks--
    number--
  }
}

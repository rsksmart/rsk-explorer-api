import { getMissingSegments } from '../lib/getMissingSegments.js'
import { insertBlock } from '../lib/servicesUtils.js'
import nod3 from '../lib/nod3Connect.js'
import Logger from '../lib/Logger.js'
import { REPOSITORIES } from '../repositories/index.js'
import { getInitConfig } from '../lib/Setup.js'
import BlocksBase from '../lib/BlocksBase.js'

const { Blocks: blocksRepository } = REPOSITORIES

const log = Logger('[static-syncer-service]')

export async function staticSyncer () {
  const initConfig = await getInitConfig()
  const blocksBase = new BlocksBase({ initConfig, log })
  const blocksInDb = await blocksRepository.find({}, { number: true }, { number: 'desc' })
  const blocksNumbers = blocksInDb.map(b => b.number)
  const { number: latestBlock } = await nod3.eth.getBlock('latest')
  const missingSegments = getMissingSegments(latestBlock, blocksNumbers)
  const requestingBlocks = latestBlock - blocksNumbers.length
  let pendingBlocks = requestingBlocks - 1 // -1 because a status is inserted after block's insertion

  log.info('Starting sync...')
  log.info(`Missing segments: ${JSON.stringify(missingSegments, null, 2)}`)
  // iterate segments
  for (let i = 0; i < missingSegments.length; i++) {
    await fillSegment(missingSegments[i], requestingBlocks, pendingBlocks, blocksBase, { initConfig, log })
  }
}

async function fillSegment (segment, requestingBlocks, pendingBlocks, blocksBase, { initConfig, log }) {
  let number = segment[0]
  const lastNumber = segment[1]
  const connected = await nod3.isConnected()

  while (number >= lastNumber) {
    try {
      const timestamp = Date.now()
      const status = {
        requestingBlocks,
        pendingBlocks,
        nodeDown: !connected,
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

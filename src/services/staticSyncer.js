import dataSource from '../lib/dataSource.js'
import { getMissingSegments } from '../lib/getMissingSegments.js'
import { delay, insertBlock } from '../lib/servicesUtils.js'
import nod3 from '../lib/nod3Connect.js'
import { blockRepository } from '../repositories/block.repository.js'

export async function staticSyncer (syncStatus, { log }) {
  const { initConfig } = await dataSource()
  const blocksInDb = await blockRepository.find({}, { number: true }, { number: 'desc' })
  const blocksNumbers = blocksInDb.map(b => b.number)
  const { number: latestBlock } = await nod3.eth.getBlock('latest')
  const missingSegments = getMissingSegments(latestBlock, blocksNumbers)
  const requestingBlocks = latestBlock - blocksNumbers.length
  let pendingBlocks = requestingBlocks - 1 // -1 because a status is inserted after block's insertion

  log.info('Starting sync...')
  log.info(`Missing segments: ${JSON.stringify(missingSegments, null, 2)}`)
  // iterate segments
  for (let i = 0; i < missingSegments.length; i++) {
    fillSegment(syncStatus, missingSegments[i], requestingBlocks, pendingBlocks, { initConfig, log })
  }
}

async function fillSegment (syncStatus, segment, requestingBlocks, pendingBlocks, { initConfig, log }) {
  let number = segment[0]
  const lastNumber = segment[1]

  while (number >= lastNumber) {
    if (syncStatus.checkingDB) {
      await delay(6000)
      console.log('Static sync stopped for 6 secs due to reorg')
      continue
    }
    try {
      const timestamp = Date.now()
      const connected = await nod3.isConnected()
      const status = {
        requestingBlocks,
        pendingBlocks,
        nodeDown: !connected,
        timestamp
      }

      await insertBlock(number, { initConfig, log }, status)
    } catch (error) {
      log.info(`There was an error saving block ${number}`)
      log.error(error)
    }
    pendingBlocks--
    number--
  }
}

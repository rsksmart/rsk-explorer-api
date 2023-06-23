import dataSource from '../lib/dataSource.js'
import { getMissingSegments } from '../lib/getMissingSegments.js'
import { insertBlock } from '../lib/servicesUtils.js'
import nod3 from '../lib/nod3Connect.js'
import { blockRepository } from '../repositories/block.repository.js'
import Logger from '../lib/Logger.js'

const log = Logger('explorer-services')

export async function staticSyncer ({ syncStatus } = {}) {
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
    const currentSegment = missingSegments[i]
    let number = currentSegment[0]
    let status
    const lastNumber = currentSegment[currentSegment.length - 1]

    // iterate segment numbers
    while (number >= lastNumber) {
      try {
        const connected = await nod3.isConnected()
        const nodeDown = !connected
        const timestamp = Date.now()
        status = { requestingBlocks, pendingBlocks, nodeDown, timestamp }

        await insertBlock({ number, status, initConfig, log })
      } catch (error) {
        throw error
      }
      pendingBlocks--
      number--
    }
  }

  log.info('Static syncer finished.')
}

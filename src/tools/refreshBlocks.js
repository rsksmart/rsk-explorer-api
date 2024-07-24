import { Setup } from '../lib/Setup'
import Block from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'
import nod3 from '../lib/nod3Connect.js'
import { blocksRepository } from '../repositories/index.js'
import Logger from '../lib/Logger.js'

const log = Logger('[refresh-blocks]')

async function main () {
  const fromBlock = parseInt(process.argv[2])
  const toBlock = parseInt(process.argv[3])
  const logThreshold = parseInt(process.argv[4])

  if (isNaN(fromBlock)) throw new Error('fromBlock param must be a number.')
  if (isNaN(toBlock)) throw new Error('toBlock param must be a number.')
  if (logThreshold && isNaN(logThreshold)) throw new Error('logThreshold optional param must be a number')

  const { initConfig } = await Setup({ log }).start()
  let status
  try {
    status = await refreshBlocks(fromBlock, toBlock, { initConfig, log, logThreshold, printStatus: true })
  } catch (error) {
    log.error('Error while refreshing blocks.')
    log.error(error)
  }

  log.info(`Blocks refresh process finalized.`)
  log.info({ status })
  process.exit(0)
}

async function refreshBlocks (fromBlock, toBlock, { initConfig, log = console, logThreshold = 100, printStatus = false } = {}) {
  if (fromBlock > toBlock) throw new Error('fromBlock cannot be higher than toBlock')

  const latestBlock = await nod3.eth.getBlock('latest')

  if (latestBlock.number < toBlock) throw new Error('toBlock is higher than latest blockchain block')

  const blocksAmount = toBlock - fromBlock + 1 // consider fromBlock

  log.info(`Refreshing blocks from ${fromBlock} to ${toBlock} (${blocksAmount} blocks)`)

  let currentBlock = fromBlock

  const status = {
    network: initConfig.net,
    fromBlock,
    toBlock,
    logThreshold,
    currentBlock,
    blocksAmount,
    storedBlocks: 0,
    missingBlocksDetected: 0,
    erroredBlocks: 0,
    errorDetails: {}
  }

  while (currentBlock <= toBlock) {
    status.currentBlock = currentBlock

    try {
      let timestamp = Date.now()

      // delete block
      const deletion = await blocksRepository.deleteOne({ number: currentBlock })

      if (deletion.count <= 0) {
        log.info(`Warning. Missing block detected (block ${currentBlock})`)
        status.missingBlocksDetected++
      }

      // insert block
      const block = new Block(currentBlock, new BlocksBase({ nod3, initConfig }))
      await block.fetch()
      await block.save()
      timestamp = Date.now() - timestamp

      status.storedBlocks++
      log.info(`Block ${currentBlock} refreshed. (${timestamp} ms)`)
    } catch (error) {
      log.error(error)

      status.erroredBlocks++

      status.errorDetails[currentBlock] = JSON.stringify(error, undefined, 2)
    }

    if (printStatus && currentBlock % logThreshold === 0) {
      log.info({ status })
    }

    currentBlock++
  }

  return status
}

main()

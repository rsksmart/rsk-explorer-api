import dataSource from '../lib/dataSource.js'
import Block from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'
import { blockRepository } from '../repositories/block.repository.js'

const fromBlock = parseInt(process.argv[2])
const toBlock = parseInt(process.argv[3])
const descOrder = process.argv[4] === 'true'
const blocksAmount = Math.abs(fromBlock - toBlock)

const erroredBlocks = {}
const metrics = {
  savedBlocks: 0,
  totalTimeInMs: 0,
  medianBlocksPerSecond: 0,
  medianMsPerBlock: 0,
  spikesInMs: {}
}

async function syncBlocks () {
  if (isNaN(fromBlock) || isNaN(toBlock)) help()
  console.log(`Getting blocks from ${fromBlock} to ${toBlock} (${blocksAmount} blocks)`)

  const { db, initConfig } = await dataSource()
  let step = 1
  let start = fromBlock
  let end = toBlock

  if (descOrder) {
    step = -1
    start = toBlock
    end = fromBlock
  }

  for (let currentBlock = start; descOrder ? currentBlock >= end : currentBlock <= end; currentBlock += step) {
    // insertion
    let block
    let time = Date.now()

    try {
      block = new Block(currentBlock, new BlocksBase(db, { initConfig }))
      await block.fetch()
      await block.save()

      time = Date.now() - time
      console.log(`Block ${currentBlock} saved! (${time} ms)`)
    } catch (err) {
      console.log(err)

      if (err.message.includes('prisma')) {
        console.dir({ block: block.getData(true) }, { depth: null })
      }

      const blockInDb = await blockRepository.findOne({ number: currentBlock })
      if (!blockInDb) {
        erroredBlocks[currentBlock] = err
      }
    }

    // metrics
    const uncommonInsertionTime = metrics.averageMsPerBlock && time > 5 * metrics.averageMsPerBlock
    if (uncommonInsertionTime) {
      metrics.spikesInMs[currentBlock] = time
    }

    metrics.savedBlocks++
    metrics.totalTimeInMs += time
    metrics.averageBlocksPerSecond = metrics.savedBlocks / (metrics.totalTimeInMs / 1000)
    metrics.averageMsPerBlock = metrics.totalTimeInMs / metrics.savedBlocks

    // every x blocks
    if (metrics.savedBlocks % 20 === 0) {
      console.log('')
      console.log('Status:')
      printStatus()
    }
  }

  console.log('')
  console.log(`Finished in ${metrics.totalTimeInMs / 1000} seconds`)
  printStatus()

  if (Object.keys(erroredBlocks).length) {
    console.log('')
    console.log('Errored blocks:')
    console.log({ erroredBlocks })
  }

  // TODO?: retry errored blocks
  // TODO?: add datetime to logs
  process.exit(0)
}

function help () {
  const myName = process.argv[1].split('/').pop()
  console.log('')
  console.log(`Usage: ${process.argv[0]} ${myName} fromBlock=number toBlock=number descOrder=boolean`)
  console.log(`By default blocks are inserted in asc order. Set descOrder to false to reverse insertions.`)
  console.log('')

  process.exit(0)
}

function printStatus () {
  console.log('')
  console.log({ metrics })
  console.log('')
}

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(9)
})

syncBlocks()

import dataSource from '../lib/dataSource.js'
import Block from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'
import nod3 from '../lib/nod3Connect.js'
import { blockRepository } from '../repositories/block.repository.js'
import Setup from '../lib/Setup.js'

let retries = 0

async function syncBlocks (fromBlock) {
  let blockToSave = fromBlock

  try {
    const { number: toBlock } = await nod3.eth.getBlock('latest')
    console.log(`Getting blocks from ${fromBlock} to ${toBlock} (${toBlock - fromBlock} blocks)`)

    const { db, initConfig } = await dataSource()

    while (blockToSave <= toBlock) {
      let time = Date.now()
      const block = new Block(blockToSave, new BlocksBase(db, { initConfig }))

      await block.fetch()
      await block.save()

      time = Date.now() - time
      console.log(`Block ${blockToSave} saved! (${time} ms)`)
      blockToSave++
      retries = 0
    }
  } catch (error) {
    if (retries < 3) {
      retries++
      console.log(`Error saving block ${blockToSave}. Retries: ${retries}`)
      await syncBlocks(blockToSave)
    } else {
      console.log(`There was a problem with syncing; process stopped. Last block saved was ${blockToSave - 1}`)
      console.error(error)
    }
  }

  console.log('Finished.')
  process.exit(0)
}

async function main () {
  (await Setup()).start() // TODO: refactor once mongo references are removed
  const lastBlockSaved = await blockRepository.findOne({ }, { sort: { number: -1 } })
  syncBlocks(lastBlockSaved ? lastBlockSaved.number + 1 : 0)
}

main()

import BlocksBase from './BlocksBase.js'
import Block from '../services/classes/Block.js'
import { blockRepository } from '../repositories/block.repository.js'

export async function insertBlock (number, { initConfig, log }, status = undefined) {
  try {
    const block = new Block(number, new BlocksBase({ initConfig, log }), status)
    let fetchingTime = Date.now()
    await block.fetch()
    fetchingTime = Date.now() - fetchingTime

    // insert block
    let savingTime = Date.now()
    await block.save()
    savingTime = Date.now() - savingTime

    log.info(`Block ${number} saved. Fetched in ${fetchingTime} ms. Saved in ${savingTime} ms.`)
  } catch (error) {
    throw error
  }
}

export const getDbBlock = (number) => blockRepository.findOne({ number })

export const sameHash = (h1, h2) => h1 === h2

function deleteBlocks (blocks = []) {
  return blockRepository.deleteBlocksByNumbers(blocks)
}

async function insertBlocks (blocks = [], { initConfig, log }) {
  for (const number of blocks) {
    await insertBlock(number, { initConfig, log })
  }
}
export async function reorganizeBlocks ({ blocksToDelete = [], blocks: missingBlocks = [], initConfig, log }) {
  await deleteBlocks(blocksToDelete)
  log.info(`Deleted ${blocksToDelete.length} blocks: ${JSON.stringify(blocksToDelete)}`)

  log.info(`Adding ${missingBlocks.length} new chain blocks: ${JSON.stringify(missingBlocks)}`)
  await insertBlocks(missingBlocks, { initConfig, log })
}

export async function delay (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

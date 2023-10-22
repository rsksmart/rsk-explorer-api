import Block from '../services/classes/Block.js'
import { REPOSITORIES } from '../repositories/index.js'

const { Blocks: blocksRepository } = REPOSITORIES

export async function insertBlock (number, blocksBase, { log, tipBlock = false }, status = undefined) {
  try {
    const block = new Block(number, blocksBase, status, tipBlock)
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

export const getDbBlock = (number) => blocksRepository.findOne({ number })

export const sameHash = (h1, h2) => h1 === h2

function deleteBlocks (blocks = []) {
  return blocksRepository.deleteBlocksByNumbers(blocks)
}

async function insertBlocks (blocks = [], blocksBase, { initConfig, log }) {
  for (const number of blocks) {
    await insertBlock(number, blocksBase, { initConfig, log })
  }
}
export async function reorganizeBlocks (blocksBase, { blocksToDelete = [], blocks: missingBlocks = [], initConfig, log }) {
  await deleteBlocks(blocksToDelete)
  log.info(`Deleted ${blocksToDelete.length} blocks: ${JSON.stringify(blocksToDelete)}`)

  log.info(`Adding ${missingBlocks.length} new chain blocks: ${JSON.stringify(missingBlocks)}`)
  await insertBlocks(missingBlocks, blocksBase, { initConfig, log })
}

export async function delay (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

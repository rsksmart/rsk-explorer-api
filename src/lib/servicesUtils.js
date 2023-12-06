import Block from '../services/classes/Block.js'
import { blocksRepository } from '../repositories/index.js'

const RETRIES = 3

export async function insertBlock (number, blocksBase, { log, tipBlock = false }, status = undefined) {
  let remainingAttempts = RETRIES

  while (remainingAttempts > 0) {
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
      break // Success
    } catch (err) {
      log.error(`Error saving block ${number}`)
      log.error(err)

      const storedBlock = await blocksRepository.findOne({ number }, { number: true })

      if (storedBlock && storedBlock.number) {
        log.error(`Block ${storedBlock.number} was saved but an error occurred during the process. Check the logs`)
        break
      }

      remainingAttempts--
      log.error(`Block ${number} could not be saved. Retrying... (remaining attempts: ${remainingAttempts})`)
    }
  }

  if (!remainingAttempts) log.error(`Block ${number} could not be saved after ${RETRIES} retries.`)
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

import Block from '../services/classes/Block.js'
import { blocksRepository } from '../repositories/index.js'
import { getInitConfig } from './Setup.js'
import BlocksBase from './BlocksBase.js'
import { updateDbTipBlock } from '../services/liveSyncer.js'
import Logger from './Logger.js'

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
        log.error(`Block ${storedBlock.number} was saved but the blockchain stats saving process may have failed. Check the logs`)
        break
      }

      remainingAttempts--
      log.error(`Block ${number} could not be saved. Retrying... (remaining attempts: ${remainingAttempts})`)
    }
  }

  if (!remainingAttempts) log.error(`Block ${number} could not be saved after ${RETRIES} retries.`)
}

export async function insertBlocks (blocks = [], blocksBase, { initConfig, log }) {
  for (const number of blocks) {
    await insertBlock(number, blocksBase, { initConfig, log })
  }
}

export async function saveInitialTip (syncStatus, tipSize) {
  const initConfig = await getInitConfig()
  const log = Logger('[savetip-service]')
  const blocksBase = new BlocksBase({ initConfig, log })

  const lastSafeBlock = syncStatus.latestBlock.number - tipSize
  let current = syncStatus.latestBlock.number

  while (current > lastSafeBlock) {
    log.info(`Saving block ${current} from initial tip`)
    await updateDbTipBlock(current, blocksBase, { initConfig, log }, tipSize)
    syncStatus.startedSavingInitialTip = true
    current--
  }

  log.info(`Finished saving initial tip.`)
}

export async function delay (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

export const getDbBlock = (number) => blocksRepository.findOne({ number })

export const sameHash = (h1, h2) => h1 === h2

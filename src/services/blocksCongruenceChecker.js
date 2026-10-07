import nod3 from '../lib/nod3Connect'
import { blocksRepository } from '../repositories'
import { insertBlock } from '../lib/servicesUtils'
import { getInitConfig } from '../lib/Setup'
import BlocksBase from '../lib/BlocksBase'

export async function checkBlocksCongruence (blocksToCheck, { log = console, latestBlock, confirmationsThreshold } = {}) {
  const status = {
    blocksToCheck,
    badBlocks: {
      total: 0,
      blocks: {}
    }
  }

  const [lastSavedBlock] = await blocksRepository.find({}, { number: true, hash: true }, { number: 'desc' }, 1)
  if (!lastSavedBlock || !lastSavedBlock.number) throw new Error(`Database is empty. Skipping blocks congruence check...`)

  const initConfig = await getInitConfig()
  const blocksBase = new BlocksBase({ initConfig, log })
  const lastImmutableBlockNumber = latestBlock - confirmationsThreshold

  log.info(`Checking last ${blocksToCheck} blocks congruence...`)

  const lowerBlock = lastSavedBlock.number - blocksToCheck < 0 ? 0 : lastSavedBlock.number - blocksToCheck

  for (let number = lastSavedBlock.number; number >= lowerBlock; number--) {
    try {
      const dbBlock = await blocksRepository.findOne({ number })
      if (!dbBlock) {
        log.info(`Warning. Block ${number} is not stored in database.`)
        continue
      }

      const nodeBlock = await nod3.eth.getBlock(number)
      if (!nodeBlock || !nodeBlock.number) throw new Error(`Node returns invalid block data for block ${number}: ${JSON.stringify(nodeBlock, null, 2)}`)

      if (dbBlock.hash !== nodeBlock.hash) {
        const replaced = await insertBlock(number, blocksBase, { log, tipBlock: number > lastImmutableBlockNumber, replace: true })

        if (replaced) {
          log.info(`Database block ${number} (hash ${dbBlock.hash}) didn't match node block (hash ${nodeBlock.hash}). Replaced`)

          status.badBlocks.total++
          status.badBlocks.blocks[number] = {
            badBlockHash: dbBlock.hash,
            goodBlockHash: nodeBlock.hash
          }
        }
      } else {
        log.info(`Block ${number} ok.`)
      }
    } catch (err) {
      log.error(err)
      log.info(`Error while checking block ${number} congruence`)
    }
  }

  log.info(`Finished checking last ${blocksToCheck} database blocks congruence. ${status.badBlocks.total} bad blocks replaced.`)
  log.info(JSON.stringify({ status }, null, 2))

  return status
}

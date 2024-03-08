import { blocksRepository } from '../repositories'
import nod3 from '../lib/nod3Connect'
import { insertBlock } from '../lib/servicesUtils'
import { getInitConfig } from '../lib/Setup'
import BlocksBase from '../lib/BlocksBase'
import Logger from '../lib/Logger'

const log = Logger('[database-tip-checker]')

export async function checkDbTipBlocks ({ latestBlock }, confirmationsThreshold) {
  const initConfig = await getInitConfig()
  const blocksBase = new BlocksBase({ initConfig, log })

  const [lastSavedBlock] = await blocksRepository.find({}, { number: true, hash: true }, { number: 'desc' }, 1)

  log.info('Checking database tip blocks congruence...')

  if (!lastSavedBlock) {
    log.info('Database is empty. Tip blocks check skipped.')
  } else {
    const lastValidDbBlockNumber = lastSavedBlock.number - confirmationsThreshold
    const lastImmutableBlockNumber = latestBlock.number - confirmationsThreshold

    for (let number = lastValidDbBlockNumber + 1; number <= lastSavedBlock.number; number++) {
      const nodeBlock = await nod3.eth.getBlock(number)
      const dbBlock = await blocksRepository.findOne({ number })

      if (dbBlock && dbBlock.hash !== nodeBlock.hash) {
        await blocksRepository.deleteOne({ number })
        await insertBlock(number, blocksBase, { log, tipBlock: number > lastImmutableBlockNumber })
        log.info(`Database block ${number} didn't match node block. Updated. (Previous hash: ${dbBlock.hash}. New hash: ${nodeBlock.hash})`)
      } else {
        log.info(`Block ${number} ok.`)
      }
    }

    log.info('Finished checking database tip blocks.')
  }
}

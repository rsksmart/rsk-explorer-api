
import nod3 from '../lib/nod3Connect'
import { blocksRepository } from '../repositories'

export async function checkBlocksCongruence () {
  const defaultBlocksToCheck = 86400 // last 30 days
  let blocksToCheck = parseInt(process.argv[2])

  blocksToCheck = isNaN(blocksToCheck) ? defaultBlocksToCheck : blocksToCheck

  const [lastSavedBlock] = await blocksRepository.find({}, { number: true, hash: true }, { number: 'desc' }, 1)
  if (!lastSavedBlock || !lastSavedBlock.number) throw new Error(`Database is empty. Skipping blocks check... (latest db block: ${lastSavedBlock}`)

  const status = {
    blocksAmountToCheck: blocksToCheck,
    fromBlock: lastSavedBlock.number,
    toBlock: lastSavedBlock.number - blocksToCheck,
    current: 0,
    checkedBlocks: 0,
    missingBlocks: 0,
    badBlocks: {
      total: 0,
      blocks: []
    }
  }

  console.log(`Checking last ${blocksToCheck} blocks congruence...`)
  const intervalId = setInterval(() => console.dir({ status }, { depth: null }), 5000)

  for (let number = lastSavedBlock.number; number >= 0; number--) {
    try {
      if (status.checkedBlocks === blocksToCheck) {
        console.log(`Blocks check amount reached (${blocksToCheck})`)
        break
      }

      status.current = number

      const dbBlock = await blocksRepository.findOne({ number })
      if (!dbBlock) {
        status.missingBlocks++
        continue
      }

      const nodeBlock = await nod3.eth.getBlock(number)
      if (dbBlock.hash !== nodeBlock.hash) {
        await blocksRepository.deleteOne({ number })
        console.log(`Database block ${number} (hash ${dbBlock.hash}) didn't match node block (hash ${nodeBlock.hash}). Removed`)

        status.badBlocks.total++
        status.badBlocks.blocks.push({
          number,
          badBlockHash: dbBlock.hash,
          goodBlockHash: nodeBlock.hash
        })
      }
    } catch (err) {
      console.log(`Block ${number} check error`, err)
    }

    status.checkedBlocks++
  }

  clearInterval(intervalId)

  console.log(`Finished checking db blocks congruence. ${status.badBlocks.total} bad blocks removed.`)
  console.dir({ status }, { depth: null })
}

checkBlocksCongruence()

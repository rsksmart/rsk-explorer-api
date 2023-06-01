import dataSource from '../lib/dataSource.js'
import Block from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'
import nod3 from '../lib/nod3Connect.js'

async function validateInputs (fromBlock, toBlock) {
  const notNumbers = isNaN(fromBlock) || isNaN(toBlock)
  const invalidSegment = fromBlock > toBlock
  const latestBlock = await nod3.eth.getBlock('latest')
  const inexistentBlock = toBlock > latestBlock.number

  function logError (msg) {
    console.log('\n' + 'Error: ' + msg + '\n')
    process.exit(9)
  }

  if (notNumbers) {
    logError('Inputs must be numbers')
  } else if (invalidSegment) {
    logError('First block number must be higher than the second one')
  } else if (inexistentBlock) {
    logError(`Second block number must be lower or equal than latest block (Latest block: ${latestBlock.number})`)
  }
}

async function syncBlocks () {
  const fromBlock = parseInt(process.argv[2])
  const toBlock = parseInt(process.argv[3])

  await validateInputs(fromBlock, toBlock)

  console.log(`Getting blocks from ${fromBlock} to ${toBlock} (${toBlock - fromBlock} blocks)`)
  const { db, initConfig } = await dataSource()

  for (let b = fromBlock; b <= toBlock; b++) {
    try {
      let time = Date.now()
      const block = new Block(b, new BlocksBase(db, { initConfig }))
      await block.fetch()
      await block.save()

      time = Date.now() - time
      console.log(`Block ${b} saved! (${time} ms)`)
    } catch (err) {
      console.log(err)
    }
  }

  console.log(`Finished.`)
  process.exit(0)
}

syncBlocks()

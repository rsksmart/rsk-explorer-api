import dataSource from '../lib/dataSource.js'
import Block from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'
import nod3 from '../lib/nod3Connect.js'

async function main () {
  if (isNaN(process.argv[2])) throw new Error('fromBlock param is missing.')
  const latestBlock = await nod3.eth.getBlock('latest')
  const fromBlock = parseInt(process.argv[2])
  const toBlock = process.argv[3] ? parseInt(process.argv[3]) : latestBlock.number

  let blockToSave = fromBlock
  try {
    console.log(`Getting blocks from ${fromBlock} to ${toBlock} (${toBlock - fromBlock} blocks)`)

    const { initConfig } = await dataSource()

    while (blockToSave <= toBlock) {
      let timestamp = Date.now()

      // insert block
      const block = new Block(blockToSave, new BlocksBase({ initConfig }))
      await block.fetch()
      await block.save()
      timestamp = Date.now() - timestamp

      console.log(`Block ${blockToSave} saved! (${timestamp} ms)`)
      blockToSave++
    }
  } catch (error) {
    console.log(`Error saving block ${blockToSave}.`)
    console.log(error)
  }

  console.log('Finished.')
  process.exit(0)
}

main()

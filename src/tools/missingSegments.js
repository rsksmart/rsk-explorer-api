import dataSource from '../lib/dataSource.js'
import { getMissingSegments } from '../lib/getMissingSegments.js'
import nod3 from '../lib/nod3Connect.js'
import { blockRepository } from '../repositories/block.repository.js'

async function main () {
  console.log(`Getting missing segments...`)
  await dataSource()
  const blocksInDb = await blockRepository.find({}, { number: true }, { number: 'desc' })
  const blocksNumbers = blocksInDb.map(b => b.number)
  const { number: latestBlock } = await nod3.eth.getBlock('latest')
  const missingSegments = getMissingSegments(latestBlock, blocksNumbers)

  console.log(`Missing segments: ${JSON.stringify(missingSegments, null, 2)}`)
  process.exit(0)
}

main()

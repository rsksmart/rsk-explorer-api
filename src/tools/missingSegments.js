import { getMissingSegments } from '../lib/getMissingSegments.js'
import nod3 from '../lib/nod3Connect.js'
import { blocksRepository } from '../repositories/index.js'

async function main () {
  console.log(`Getting missing segments...`)
  const blocksInDb = await blocksRepository.find({}, { number: true }, { number: 'desc' })
  const blocksNumbers = blocksInDb.map(b => b.number)
  const { number: latestBlock } = await nod3.eth.getBlock('latest')
  const missingSegments = getMissingSegments(latestBlock, blocksNumbers)

  console.log(`Missing segments: ${JSON.stringify(missingSegments, null, 2)}`)
  process.exit(0)
}

main()

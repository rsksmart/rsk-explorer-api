import { Setup } from '../lib/Setup'
import { blocksRepository } from '../repositories'

async function main () {
  const blockNumber = parseInt(process.argv[2])

  if (isNaN(blockNumber)) throw new Error('A block number must be provided')

  await Setup().start()

  console.log(`Deleting block...`)

  await blocksRepository.deleteOne({ number: blockNumber })

  console.log('Finished.')
  process.exit(0)
}

main()

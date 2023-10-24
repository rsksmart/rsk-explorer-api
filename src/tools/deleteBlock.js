import { Setup } from '../lib/Setup'
import { blocksRepository } from '../repositories'

async function main () {
  const block = parseInt(process.argv[2])

  if (isNaN(block)) throw new Error('A block number must be provided')

  await Setup().start()

  console.log(`Deleting block...`)

  await blocksRepository.deleteBlocksByNumbers([block])

  console.log('Finished.')
  process.exit(0)
}

main()

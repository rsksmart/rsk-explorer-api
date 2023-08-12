import { dataSource } from '../lib/dataSource'
import { REPOSITORIES } from '../repositories'

const { Blocks: blocksRepository } = REPOSITORIES

async function main () {
  const block = parseInt(process.argv[2])

  if (isNaN(block)) throw new Error('A block number must be provided')

  await dataSource()

  console.log(`Deleting block...`)

  await blocksRepository.deleteBlocksByNumbers([block])

  console.log('Finished.')
  process.exit(0)
}

main()

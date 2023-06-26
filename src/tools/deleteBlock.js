import { dataSource } from '../lib/dataSource'
import { blockRepository } from '../repositories/block.repository'

async function main () {
  const block = parseInt(process.argv[2])

  if (isNaN(block)) throw new Error('A block number must be provided')

  await dataSource()

  console.log(`Deleting block...`)

  await blockRepository.deleteBlocksByNumbers([block])

  console.log('Finished.')
  process.exit(0)
}

main()

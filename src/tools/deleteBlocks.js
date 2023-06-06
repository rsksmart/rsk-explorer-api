import { dataSource } from '../lib/dataSource'
import { blockRepository } from '../repositories/block.repository'

async function main () {
  const fromBlock = parseInt(process.argv[2])
  const toBlock = parseInt(process.argv[3])

  if (isNaN(fromBlock)) throw new Error('fromBlock param must be a number')
  if (isNaN(toBlock)) throw new Error('toBlock param must be a number')
  if (toBlock - fromBlock < 0) throw new Error('First number must be lower than the second one')

  await dataSource()

  console.log(`Deleting blocks from ${fromBlock} to ${toBlock} (${toBlock - fromBlock} blocks) `)

  const query = {
    number: {
      gte: fromBlock,
      lte: toBlock
    }
  }

  const deletedBlocksCount = await blockRepository.deleteMany(query)

  console.log('Finished.')
  console.log({ deletedBlocksCount })
  process.exit(0)
}

main()

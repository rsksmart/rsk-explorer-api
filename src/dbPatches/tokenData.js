
import dataSource from '../lib/dataSource.js'
import { Block, deleteBlockDataFromDb } from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'
import { deleteBlockSummaryFromDb, getBlockSummariesByNumber } from '../services/classes/BlockSummary'
import { tokenRepository } from '../repositories/token.repository'

update().then((addresses) => {
  if (addresses.length) {
    console.log('Addresses:')
    console.log(JSON.stringify(addresses, null, 2))
  } else {
    console.log('There are not invalid token data')
  }
  process.exit(0)
})

async function update () {
  try {
    const addresses = {}
    const { collections, db, initConfig } = await dataSource()
    const collection = collections.Addrs
    const q = { $type: 'object' }
    const query = { $or: [{ decimals: q }, { totalSupply: q }] }
    const project = { address: 1, name: 1, blockNumber: 1 }
    const cursor = tokenRepository.find(query, project, collection)

    while (await cursor.hasNext()) {
      let { address, name, blockNumber } = await cursor.next()
      addresses[address] = { address, name }
      console.log(`Address: ${address}, name:${name}`)
      let summaries = await getBlockSummariesByNumber(blockNumber, collections)
      summaries = summaries.map(({ hash }) => hash)
      console.log(`Removing block summaries for block ${blockNumber}`)
      await Promise.all([...summaries.map(hash => deleteBlockSummaryFromDb(hash, collections))])
      console.log(`Deleting block ${blockNumber} from db`)
      await Promise.all([...summaries.map(hash => deleteBlockDataFromDb(hash, blockNumber, collections))])
      console.log(`Getting block ${blockNumber}`)
      let block = new Block(blockNumber, new BlocksBase(db, { initConfig }))
      await block.save()
    }
    return Object.values(addresses)
  } catch (err) {
    console.error(err)
    process.exit(9)
  }
}

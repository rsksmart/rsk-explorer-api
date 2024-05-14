import BlockSummary from '../services/classes/BlockSummary'
import nod3 from '../lib/nod3Connect'
import { createInitConfig } from '../lib/Setup'
import { prismaClient } from '../lib/prismaClient'
// eslint-disable-next-line
import TxTrace from '../services/classes/TxTrace'
// eslint-disable-next-line
import { BlockAddresses } from '../services/classes/BlockAddresses'
// eslint-disable-next-line
import Tx from '../services/classes/Tx'
import { addressRepository } from '../repositories'

async function main () {
  console.log('\nStarting patch "db_patch_07_05_2023_add_missing_contracts_addresses_created_by_contracts.js"\n')
  let latestDbBlock = await prismaClient.block.findFirst({ select: { number: true }, orderBy: { number: 'desc' }, take: 1 })

  if (!latestDbBlock) throw new Error('No blocks in db')

  const addressesInDb = (await prismaClient.address.findMany({ select: { address: true } })).map(addressEntity => addressEntity.address)
  const blocksNumbers = []

  // load blocks numbers in memory
  try {
    let currentNumber = latestDbBlock.number

    console.log('Retrieving existing block numbers from db (max interval range: 10000)...')

    while (currentNumber > -1) {
      const blocks = await prismaClient.block.findMany({
        where: { number: { lte: currentNumber } },
        select: { number: true },
        orderBy: { number: 'desc' },
        take: 10000
      })

      if (!blocks.length) {
        console.log('')
        break
      }

      const numbers = blocks.map(b => b.number)
      blocksNumbers.push(...numbers)

      const high = numbers[0]
      const low = numbers[numbers.length - 1]
      console.log(`Loaded interval [${high}, ${low}] (${numbers.length} ${numbers.length > 1 ? 'blocks' : 'block'})`)
      currentNumber = low - 1
      // Example: [1000, 999...902, 901] | Next time: [900, 899...802, 801] and so on
    }
  } catch (error) {
    console.log('Error retrieving blocks numbers from db')
    console.log(error)
    process.exit(1)
  }

  // start db patch
  console.log(`Total blocks to analyse: ${blocksNumbers.length}\n`)

  const initConfig = await createInitConfig()

  // retrieve addresses for each block
  for (const number of blocksNumbers) {
    if (number % 10000 === 0) console.log(`Status check: current block ${number}`)
    try {
      const BlockSummaryInstance = new BlockSummary(number, { nod3, initConfig })
      const block = await BlockSummaryInstance.getBlockData()

      /** @type {BlockAddresses} */
      const BlockAddressesInstance = new BlockAddresses(block, { nod3, initConfig })
      // BlockAddressesInstance.add(block.miner, { block }) // not required

      /** @type {Tx[]} */
      const TxsInstances = await BlockSummaryInstance.createTxs(block, BlockAddressesInstance)
      // const txsData = await this.fetchItems(Txs) // not required

      for (const TxInstance of TxsInstances) {
        /** @type {TxTrace} */
        const TxTraceInstance = TxInstance.trace

        const { addresses } = await TxTraceInstance.getInternalTransactionsData() // now missing contract addresses are retrieved too

        for (const address of addresses) {
          if (!addressesInDb.includes(address)) {
            BlockAddressesInstance.add(address, { block }) // prepare for save
          }
        }
      }

      const addressesToSave = await BlockAddressesInstance.fetch()

      if (addressesToSave.length) {
        for (const address of addressesToSave) {
          await prismaClient.$transaction(addressRepository.insertOne(address))
        }
        console.log(`Missing addresses detected for block ${number}: ${JSON.stringify(addressesToSave.map(a => a.address))}. Saved.`)
      }
    } catch (error) {
      console.log(`Error while processing block ${number}`)
      console.error(error)
    }
  }

  console.log('\nDone.\n')
  process.exit(0)
}

main()

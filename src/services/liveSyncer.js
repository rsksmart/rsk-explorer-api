import { connectToNode } from '../lib/connectToNode'
import { dataSource } from '../lib/dataSource'
import { deleteBadBlocks, insertBlock, insertBlocks, getDbBlock, sameHash } from '../lib/servicesUtils'
import nod3 from '../lib/nod3Connect'
let checkingDB = false

async function liveSyncer () {
  await connectToNode(nod3)
  const { initConfig } = await dataSource()
  setInterval(async () => {
    if (!checkingDB) {
      await newBlocksHandler({ initConfig })
    }
  }, 5000)
  console.log('Listening to new blocks...')
}

async function newBlocksHandler ({ initConfig }) {
  const latestBlock = await nod3.eth.getBlock('latest')
  try {
    const exists = await getDbBlock(latestBlock.number)
    if (exists) {
      console.log(`Block ${latestBlock.number} already saved. Skipped.`)
    } else {
      const previousInDb = await getDbBlock(latestBlock.number - 1)
      if (!previousInDb || sameHash(latestBlock.parentHash, previousInDb.hash)) {
        // previousBlock not exists OR previousBlock exists and blocks are congruent
        await insertBlock({ number: latestBlock.number, initConfig })
      } else {
        // previousInDb exists and is not parent of latestBlock (possible reorganization)
        console.log(`Latest block(${latestBlock.number}) parentHash is incongruent with latest db block (${previousInDb.number}) hash`)
        console.log({ latestParentHash: latestBlock.parentHash, latestDbHash: previousInDb.hash })
        checkingDB = true
        await reorganize({ latestBlock, initConfig })
        checkingDB = false
      }
    }
  } catch (error) {
    console.log(`Error handling new block: ${latestBlock.number}`, error)
  }
}

async function reorganize ({ latestBlock, initConfig }) {
  console.log('Checking database...')
  console.log({ latestBlock, initConfig })

  let chainsParentBlockFound = false
  const missingBlocks = [latestBlock.number] // include latest by default
  const blocksToDelete = []

  let current = latestBlock.number - 1
  try {
    while (!chainsParentBlockFound) {
      // approach: by comparing both previous blocks hashes
      const newChainPreviousBlock = await nod3.eth.getBlock(current)
      const dbChainPreviousBlock = await getDbBlock(current)

      console.log({
        newChainPreviousBlock: {
          number: newChainPreviousBlock.number,
          hash: newChainPreviousBlock.hash,
          parentHash: newChainPreviousBlock.parentHash
        },
        dbChainPreviousBlock: {
          number: dbChainPreviousBlock.number,
          hash: dbChainPreviousBlock.hash,
          parentHash: dbChainPreviousBlock.parentHash
        }
      })

      if (sameHash(newChainPreviousBlock.hash, dbChainPreviousBlock.hash)) {
        console.log(`Chains parent block found! (${current})`)
        chainsParentBlockFound = true // fork block found
        break
      }

      missingBlocks.unshift(newChainPreviousBlock.number)
      blocksToDelete.push(newChainPreviousBlock.number)
      current--
    }

    console.log(`New chain blocks found: ${JSON.stringify(missingBlocks)}`)
    console.log(`Old chain blocks to delete: ${JSON.stringify(blocksToDelete)}`)

    await deleteBadBlocks(blocksToDelete)
    await insertBlocks({ blocks: missingBlocks, initConfig })
  } catch (error) {
    console.log(error)
  }
}

liveSyncer()

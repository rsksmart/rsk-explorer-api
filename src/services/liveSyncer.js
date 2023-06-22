import { dataSource } from '../lib/dataSource'
import { insertBlock, getDbBlock, sameHash, reorganizeBlocks } from '../lib/servicesUtils'
import nod3 from '../lib/nod3Connect'
import defaultConfig from '../lib/defaultConfig'

const CONFIRMATIONS_THERESHOLD = defaultConfig.blocks.bcTipSize || 120

export async function liveSyncer ({ syncStatus, log }) {
  try {
    const { initConfig } = await dataSource()
    setInterval(() => newBlocksHandler({ initConfig, syncStatus, log }), 10000)
    log.info('Listening to new blocks...')
  } catch (error) {
    log.info(error)
  }
}

async function newBlocksHandler ({ initConfig, syncStatus, log }) {
  if (syncStatus.checkingDB) return

  let latestBlock
  try {
    latestBlock = await nod3.eth.getBlock('latest')
    const exists = await getDbBlock(latestBlock.number)
    if (exists || latestBlock.number <= syncStatus.lastReceived) return

    if (syncStatus.lastReceived >= 0 && syncStatus.number - syncStatus.lastReceived > 1) {
      for (let number = syncStatus.lastReceived + 1; number <= latestBlock.number; number++) {
        syncStatus.updatingTip = true
        await insertBlock({ number, initConfig, log })
        syncStatus.updatingTip = false
      }
    }

    // log.info({ syncStatus })
    const previousInDb = await getDbBlock(latestBlock.number - 1)
    if (!previousInDb || sameHash(latestBlock.parentHash, previousInDb.hash)) {
      // previousBlock not exists OR previousBlock exists and blocks are congruent
      syncStatus.updatingTip = true
      await insertBlock({ number: latestBlock.number, initConfig, log })
      syncStatus.updatingTip = false
    } else {
      // previousInDb exists and is not parent of latestBlock (possible reorganization)
      log.info(`Latest db block (${previousInDb.number}) hash is incongruent with latest block(${latestBlock.number}) parentHash`)
      log.info({ latestParentHash: latestBlock.parentHash, latestDbHash: previousInDb.hash })

      syncStatus.checkingDB = true
      await reorganize({ latestBlock, initConfig, log })
      syncStatus.checkingDB = false
    }

    syncStatus.lastReceived = latestBlock.number
  } catch (error) {
    log.info(`Error handling new block: ${latestBlock.number}`, error)
  }
}

async function reorganize ({ latestBlock, initConfig, log }) {
  log.info('Checking blocks congruence...')
  log.info({
    latestBlock: {
      number: latestBlock.number,
      hash: latestBlock.hash,
      parentHash: latestBlock.parentHash
    }
  })

  let chainsParentBlockFound = false
  const missingBlocks = [latestBlock.number] // include latest by default
  const blocksToDelete = []

  let current = latestBlock.number - 1
  let gap = CONFIRMATIONS_THERESHOLD - 1 // - 1 since we already know last db block is incongruent

  try {
    while (!chainsParentBlockFound && gap > 0) {
      // approach: by comparing both previous blocks hashes until finding fork block OR reaching confirmations gap
      const newChainPreviousBlock = await nod3.eth.getBlock(current)
      const dbChainPreviousBlock = await getDbBlock(current)

      log.info({ current, gap })
      if (dbChainPreviousBlock) {
        log.info({
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
        chainsParentBlockFound = sameHash(newChainPreviousBlock.hash, dbChainPreviousBlock.hash)
        if (chainsParentBlockFound) break
      }

      // db block is inexistent or incongruent
      blocksToDelete.push(newChainPreviousBlock.number)
      missingBlocks.unshift(newChainPreviousBlock.number)
      current--
      gap--
    }

    log.info(`Chains parent block found! (${current}). Reorg depth: ${CONFIRMATIONS_THERESHOLD - gap}`)
    log.info(`New chain blocks: ${JSON.stringify(missingBlocks)}`)
    log.info(`Old chain blocks: ${JSON.stringify(blocksToDelete)}`)

    await reorganizeBlocks({ blocksToDelete, blocks: missingBlocks, initConfig })

    log.info(`Finished reorganization process!`)
  } catch (error) {
    throw error
  }
}

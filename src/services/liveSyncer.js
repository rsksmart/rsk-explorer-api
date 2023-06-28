import { insertBlock, getDbBlock, sameHash, reorganizeBlocks } from '../lib/servicesUtils'
import nod3 from '../lib/nod3Connect'
import Logger from '../lib/Logger'

const TIP_BLOCK_FETCH_INTERVAL = 3000
const CONFIRMATIONS_THERESHOLD = 120
const log = Logger('[live-syncer-service]')

export async function liveSyncer (syncStatus, { initConfig }) {
  setInterval(() => newBlocksHandler(syncStatus, { initConfig, log }), TIP_BLOCK_FETCH_INTERVAL)
  log.info('Listening to new blocks...')
}

async function newBlocksHandler (syncStatus, { initConfig, log }) {
  // Case 1: already updating tip
  if (syncStatus.updatingTip) return

  let latestBlock
  try {
    latestBlock = await nod3.eth.getBlock('latest')
    const exists = await getDbBlock(latestBlock.number)

    // Case 2: latest exists
    if (exists) return

    // Case 3: latest must be added
    syncStatus.updatingTip = true

    // 3.1: Gap of 2+ blocks from latest
    if (syncStatus.lastReceived >= 0 && latestBlock.number - syncStatus.lastReceived > 1) {
      log.info(`Gap of 2 or more blocks detected from last received block (${syncStatus.lastReceived}) to latest block (${latestBlock.number}). Updating...`)
      let next = syncStatus.lastReceived + 1
      while (next <= latestBlock.number) {
        await updateDbTipBlock(next, syncStatus, { initConfig, log })
        next++
      }
    } else {
      // 3.2: Gap of 1 block from latest
      await updateDbTipBlock(latestBlock.number, syncStatus, { initConfig, log })
    }
  } catch (error) {
    log.info(`Error while handling new block: ${latestBlock.number}`)
    log.info(error)
  }
  syncStatus.lastReceived = latestBlock.number
  syncStatus.updatingTip = false
}

async function updateDbTipBlock (number, syncStatus, { initConfig, log }) {
  const nextBlock = await nod3.eth.getBlock(number)
  const previousBlockInDb = await getDbBlock(number - 1)
  // previous block is not in db OR previousBlock exists and blocks are congruent
  if (!previousBlockInDb || sameHash(previousBlockInDb.hash, nextBlock.parentHash)) {
    // normal insert
    await insertBlock(nextBlock.number, { initConfig, log, tipBlock: true })
  } else {
    // previousInDb exists and is not parent of latestBlock (reorganization)
    log.info(`Latest db block (${previousBlockInDb.number}) hash is incongruent with next block (${nextBlock.number}) parentHash`)
    syncStatus.checkingDB = true
    await reorganize(nextBlock, { initConfig, log })
    syncStatus.checkingDB = false
  }
}

async function reorganize (toBlock, { initConfig, log }) {
  log.info('Checking blocks congruence...')

  let chainsParentBlockFound = false
  const missingBlocks = [toBlock.number] // include latest by default
  const blocksToDelete = []

  let current = toBlock.number - 1
  let gap = CONFIRMATIONS_THERESHOLD - 1 // - 1 since we already know last db block is incongruent

  try {
    while (!chainsParentBlockFound && gap > 0) {
      // approach: by comparing both previous blocks hashes until finding fork block OR reaching confirmations gap
      const newChainPreviousBlock = await nod3.eth.getBlock(current)
      const dbChainPreviousBlock = await getDbBlock(current)

      if (dbChainPreviousBlock) {
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
    log.info(`Old chain blocks: ${JSON.stringify(blocksToDelete.slice().reverse())}`)

    await reorganizeBlocks({ blocksToDelete, blocks: missingBlocks, initConfig, log })

    log.info(`Finished reorganization process!`)
  } catch (error) {
    throw error
  }
}

import { BigNumber } from 'bignumber.js'
import Logger from './Logger'
import { btcBlockStore } from './btcBlockStore'

export async function getMergeMiningStats ({
  client,
  windowBlocks = 1000,
  store = btcBlockStore,
  log = Logger('[merge-mining-stats]')
}) {
  if (!client) throw new Error('Missing Bitcoin client')
  if (!Number.isInteger(windowBlocks) || windowBlocks < 1) throw new Error(`Invalid windowBlocks: ${windowBlocks}`)

  const toHeight = await store.maxHeight()
  if (toHeight === null || toHeight === undefined) throw new Error('No Bitcoin blocks ingested yet')

  const fromHeight = Math.max(0, toHeight - windowBlocks + 1)
  const expected = toHeight - fromHeight + 1

  const [bitcoinBlocks, mergeMinedBlocks] = await Promise.all([
    store.countInRange(fromHeight, toHeight),
    store.countMergeMinedInRange(fromHeight, toHeight)
  ])

  if (bitcoinBlocks !== expected) {
    throw new Error(`Incomplete window ${fromHeight}-${toHeight}: ${bitcoinBlocks}/${expected} blocks stored`)
  }

  const bitcoinHashrate = new BigNumber(await client.getNetworkHashps(windowBlocks))
  if (!bitcoinHashrate.isFinite() || bitcoinHashrate.lte(0)) {
    throw new Error(`Invalid Bitcoin hashrate: ${bitcoinHashrate.toString()}`)
  }

  const mergeMiningPercentage = new BigNumber(mergeMinedBlocks).dividedBy(bitcoinBlocks)
  const rootstockSecuredHashrate = bitcoinHashrate.times(mergeMiningPercentage)

  log.info(`Window ${fromHeight}-${toHeight}: ${mergeMinedBlocks}/${bitcoinBlocks} merge-mined (${mergeMiningPercentage.times(100).toFixed(2)}%)`)

  return {
    bitcoinHashrate: bitcoinHashrate.toFixed(0),
    rootstockSecuredHashrate: rootstockSecuredHashrate.toFixed(0),
    mergeMiningPercentage: mergeMiningPercentage.toFixed(6),
    bitcoinBlocks,
    mergeMinedBlocks,
    fromHeight,
    toHeight
  }
}

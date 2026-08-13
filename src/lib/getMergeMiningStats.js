import { BigNumber } from 'bignumber.js'
import Logger from './Logger'
import { btcBlockRepository } from '../repositories'

// The share's standard error over a 1000-block window is already ~1.5 points, so the last 2% of
// heights cannot move the published figure. The floor is what keeps a persistent provider failure
// from degrading into a quiet half-window: below it the snapshot refuses instead of narrowing.
const MINIMUM_WINDOW_COVERAGE = 0.98

export async function getMergeMiningStats ({
  client,
  windowBlocks = 1000,
  store = btcBlockRepository,
  log = Logger('[merge-mining-stats]')
}) {
  if (!client) throw new Error('Missing Bitcoin client')
  if (!Number.isInteger(windowBlocks) || windowBlocks < 1) throw new Error(`Invalid windowBlocks: ${windowBlocks}`)

  const toHeight = await store.maxHeight()
  if (toHeight === null || toHeight === undefined) throw new Error('No Bitcoin blocks ingested yet')

  const fromHeight = Math.max(0, toHeight - windowBlocks + 1)
  const heightsInWindow = toHeight - fromHeight + 1

  const { total: bitcoinBlocks, mergeMined: mergeMinedBlocks } = await store.countsInRange(fromHeight, toHeight)

  if (bitcoinBlocks < Math.ceil(heightsInWindow * MINIMUM_WINDOW_COVERAGE)) {
    throw new Error(
      `Incomplete window ${fromHeight}-${toHeight}: ${bitcoinBlocks}/${heightsInWindow} blocks stored, ` +
      `under the ${(MINIMUM_WINDOW_COVERAGE * 100).toFixed(0)}% a snapshot may be published over`
    )
  }

  if (bitcoinBlocks < heightsInWindow) {
    log.warn(
      `Window ${fromHeight}-${toHeight} is missing ${heightsInWindow - bitcoinBlocks} height(s); publishing over ` +
      `the ${bitcoinBlocks} stored. Run: npm run backfill-btc-blocks -- --from ${fromHeight} --to ${toHeight}`
    )
  }

  const bitcoinHashrate = new BigNumber(await client.getNetworkHashps(heightsInWindow, toHeight))
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

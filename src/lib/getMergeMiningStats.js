import { BigNumber } from 'bignumber.js'
import { isRskMergeMined } from './rskMergeMiningTag'
import Logger from './Logger'

export async function getMergeMiningStats ({
  client,
  sampleSize = 1000,
  hashratePeriod = '1w',
  minCoverage = 0.9,
  log = Logger('[merge-mining-stats]')
}) {
  if (!client) throw new Error('Missing Bitcoin client')

  // Fetched first so a bad hashrate fails fast, before the long block walk
  const bitcoinHashrate = new BigNumber(await client.getNetworkHashrate(hashratePeriod))
  if (!bitcoinHashrate.isFinite() || bitcoinHashrate.lte(0)) {
    throw new Error(`Invalid Bitcoin hashrate: ${bitcoinHashrate.toString()}`)
  }

  const tipHeight = await client.getTipHeight()
  if (!Number.isInteger(tipHeight) || tipHeight < 0) throw new Error(`Invalid tip height: ${tipHeight}`)

  const lowestHeight = Math.max(0, tipHeight - sampleSize + 1)
  const requested = tipHeight - lowestHeight + 1
  let mergeMinedBlocks = 0
  let bitcoinBlocksSampled = 0
  let failed = 0

  for (let height = tipHeight; height >= lowestHeight; height--) {
    try {
      const coinbase = await client.getCoinbase(await client.getBlockHash(height))
      if (!coinbase) throw new Error(`Missing coinbase for block ${height}`)
      if (isRskMergeMined(coinbase)) mergeMinedBlocks++
      bitcoinBlocksSampled++
    } catch (error) {
      failed++
      log.warn(`Skipping BTC block ${height}: ${error.message}`)
    }
    await client.throttle()
  }

  // A failing or hostile provider must not skew the ratio by starving us of blocks
  if (bitcoinBlocksSampled < requested * minCoverage) {
    throw new Error(`Insufficient block coverage: ${bitcoinBlocksSampled}/${requested} sampled (${failed} failed)`)
  }

  const mergeMiningPercentage = new BigNumber(mergeMinedBlocks).dividedBy(bitcoinBlocksSampled)
  const rootstockSecuredHashrate = bitcoinHashrate.times(mergeMiningPercentage)

  log.info(`Sampled ${bitcoinBlocksSampled}/${requested} BTC blocks (${failed} failed); ${mergeMinedBlocks} merge-mined (${mergeMiningPercentage.times(100).toFixed(2)}%)`)

  return {
    bitcoinHashrate: bitcoinHashrate.toFixed(0),
    rootstockSecuredHashrate: rootstockSecuredHashrate.toFixed(0),
    mergeMiningPercentage: mergeMiningPercentage.toFixed(6),
    bitcoinBlocksSampled,
    mergeMinedBlocks
  }
}

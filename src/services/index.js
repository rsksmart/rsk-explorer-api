import Logger from '../lib/Logger'
import { Setup } from '../lib/Setup'
import { checkDbTipBlocks } from './checkDbTipBlocks'
import nod3 from '../lib/nod3Connect'

import { liveSyncer } from './liveSyncer'
import { staticSyncer } from './staticSyncer'
import { txPoolService } from './txPool'
import { saveInitialTip } from '../lib/servicesUtils'
import { createMetricsServer } from '../lib/prismaMetrics'
import config from '../lib/config'
import { startCronJobs } from '../lib/cronJobs'

const confirmationsThreshold = config.blocks.bcTipSize
const blocksCongruenceCheckThreshold = config.blocks.bcTipSize * 3
const staticSyncerCheckInterval = 7200000 // 2h

const serviceName = 'blocks-service'
const log = Logger(`[${serviceName}]`)

async function main () {
  if (config.blocks.enableMetrics) {
    await createMetricsServer({ serviceName, port: config.blocks.metricsPort, log })
  }

  await (Setup({ log })).start()

  const syncStatus = {
    updatingTip: false,
    lastReceived: -1,
    latestBlock: await nod3.eth.getBlock('latest'),
    staticSyncerRunning: false,
    startedSavingInitialTip: false
  }

  startCronJobs({ log })

  await checkDbTipBlocks(syncStatus, confirmationsThreshold)

  liveSyncer(syncStatus, confirmationsThreshold)
  await saveInitialTip(syncStatus, confirmationsThreshold)

  staticSyncer(syncStatus, confirmationsThreshold, blocksCongruenceCheckThreshold)

  setInterval(async () => {
    if (!syncStatus.staticSyncerRunning) {
      syncStatus.latestBlock = await nod3.eth.getBlock('latest')
      staticSyncer(syncStatus, confirmationsThreshold, blocksCongruenceCheckThreshold)
      log.info('Starting static syncer...')
    } else {
      log.info('Checked if static syncer is still running; no action taken.')
    }
  }, staticSyncerCheckInterval)

  txPoolService()
}

main()

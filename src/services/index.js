import Logger from '../lib/Logger'
import { Setup } from '../lib/Setup'
import { checkDbTipBlocks } from './checkDbTipBlocks'
import nod3 from '../lib/nod3Connect'

import { liveSyncer } from './liveSyncer'
import { staticSyncer } from './staticSyncer'
import { txPoolService } from './txPool'
import { saveInitialTip } from '../lib/servicesUtils'

const confirmationsThreshold = 120
const staticSyncerCheckInterval = 20000 // 6h

async function main () {
  await (Setup({ log: Logger('[services-setup]') })).start()
  const log = Logger('[main-service]')

  const syncStatus = {
    updatingTip: false,
    lastReceived: -1,
    latestBlock: await nod3.eth.getBlock('latest'),
    staticSyncerRunning: false,
    startedSavingInitialTip: false
  }

  await checkDbTipBlocks(syncStatus, confirmationsThreshold)

  liveSyncer(syncStatus, confirmationsThreshold)
  await saveInitialTip(syncStatus, confirmationsThreshold)

  staticSyncer(syncStatus, confirmationsThreshold)

  setInterval(async () => {
    if (!syncStatus.staticSyncerRunning) {
      syncStatus.latestBlock = await nod3.eth.getBlock('latest')
      staticSyncer(syncStatus, confirmationsThreshold)
      log.info('Starting static syncer...')
    } else {
      log.info('Checked if static syncer is still running; no action taken.')
    }
  }, staticSyncerCheckInterval)

  txPoolService()
}

main()

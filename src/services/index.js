import Logger from '../lib/Logger'
import { Setup } from '../lib/Setup'

import { liveSyncer } from './liveSyncer'
import { staticSyncer } from './staticSyncer'
import { txPoolService } from './txPool'

const delay = 10000

async function main () {
  await (Setup({ log: Logger('[services-setup]') })).start()

  const syncStatus = {
    checkingDB: false,
    updatingTip: false,
    lastReceived: -1
  }

  staticSyncer(syncStatus)
  setTimeout(() => liveSyncer(syncStatus), delay) // allow static syncer to save latest block first
  txPoolService()
}

main()

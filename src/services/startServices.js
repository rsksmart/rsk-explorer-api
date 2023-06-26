import Logger from '../lib/Logger'
import { dataSource } from '../lib/dataSource'
import { liveSyncer } from './liveSyncer'
import { staticSyncer } from './staticSyncer'
import { txPool } from './txPool'

const log = Logger('explorer-services')
const DELAY = 10000

async function main () {
  const { initConfig } = await dataSource()
  const syncStatus = {
    checkingDB: false,
    updatingTip: false,
    lastReceived: -1
  }

  staticSyncer(syncStatus, { initConfig, log })

  setTimeout(() => {
    // allow static syncer to save latest first
    liveSyncer(syncStatus, { initConfig, log })
  }, DELAY)
  txPool({ initConfig, log })
}

main()

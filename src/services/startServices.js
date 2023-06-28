import Logger from '../lib/Logger'
import { dataSource } from '../lib/dataSource'
import { liveSyncer } from './liveSyncer'
import { staticSyncer } from './staticSyncer'
import { txPool } from './txPool'

const DELAY = 10000

const log = Logger('[explorer-services]')

async function main () {
  const { initConfig } = await dataSource({ log })
  const syncStatus = {
    checkingDB: false,
    updatingTip: false,
    lastReceived: -1
  }

  staticSyncer(syncStatus, { initConfig })

  setTimeout(() => {
    // allow static syncer to save latest first
    liveSyncer(syncStatus, { initConfig })
  }, DELAY)
  txPool({ initConfig })
}

main()

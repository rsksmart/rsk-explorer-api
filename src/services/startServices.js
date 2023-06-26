import { dataSource } from '../lib/dataSource'
import { liveSyncer } from './liveSyncer'
import { staticSyncer } from './staticSyncer'
import { txPool } from './txPool'

const DELAY = 10000

async function main () {
  const { initConfig } = await dataSource()
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

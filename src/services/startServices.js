import Logger from '../lib/Logger'
import { dataSource } from '../lib/dataSource'
import { liveSyncer } from './liveSyncer'
import { staticSyncer } from './staticSyncer'
import { txPool } from './txPool'

const log = Logger('explorer-services')

async function main () {
  const { initConfig } = await dataSource()
  const syncStatus = {
    checkingDB: false,
    updatingTip: false,
    lastReceived: -1
  }

  liveSyncer(syncStatus, { initConfig, log })
  staticSyncer(syncStatus, { initConfig, log })
  txPool({ initConfig, log })
}

main()

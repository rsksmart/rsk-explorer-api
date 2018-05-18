import config from '../../lib/config'
import datasource from '../../lib/dataSource'
import Logger from '../../lib/Logger'
import txFormat from '../../lib/txFormat'

const log = Logger('saveMinnersAsAddresses')

datasource.then((db) => {
  const Blocks = db.collection(config.blocks.blocksCollection)
  const Addresses = db.collection(config.blocks.addrCollection)

  let n = 0
  Blocks.count().then((total) => {
    Blocks.find().forEach((block) => {
      n++
      const address = block.miner
      log.info(`Block ${n}/${total} Miner: ${address}`)
      Addresses.insertOne({ address, balance: 0 })
        .catch((err) => {
          if (err.code !== 11000) log.error(err)
          else log.debug(`Dup ${address}`)
        })
    })
  })
})

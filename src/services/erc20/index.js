import conf from '../../lib/config.js'
import dataSource from '../../lib/dataSource.js'
import * as dataBase from '../../lib/Db'
import Exporter from './Erc20'
import Logger from '../../lib/Logger'

let config = Object.assign({}, conf.erc20)

const log = Logger('Erc20_Service', config.log)
config.Logger = log

const names = config.names || {}
const tokens = config.tokens || null
const exporters = {}

if (!tokens) {
  log.warn('There are no tokens in config file')
  process.exit(1)
}

dataSource.then(async db => {
  log.debug('Database Connected')
  const tokensCollection = await dataBase.createCollection(db, config.tokenCollection)

  for (let t in tokens) {
    let token = tokens[t]
    let tokenConfig = formatToken(token)
    if (tokenConfig) {
      log.info('TOKEN: ' + JSON.stringify(token))
      tokensCollection
        .update(
          { _id: token.address },
          {
            $set: token
          },
          { upsert: true }
        )
        .then(async () => {
          tokenConfig = Object.assign(tokenConfig, config)
          let collectionName = config.dbPrefix + token.address
          log.info('Creating collection: ' + collectionName)
          let collection = await tokenCollection(db, collectionName)
          exporters[token.address] = new Exporter(tokenConfig, collection)
        })
    }
  }
})

async function tokenCollection (db, name) {
  return dataBase.createCollection(db, name, [
    {
      key: { balance: 1 }
    },
    {
      key: { timestamp: 1 }
    },
    {
      key: { 'args._from': 1 }
    },
    {
      key: { 'args._to': 1 }
    }
  ])
}

function formatToken (token) {
  token = checkToken(token)
  if (token) {
    let newToken = {}
    for (let p in token) {
      let pp = 'token' + p.charAt(0).toUpperCase() + p.slice(1)
      newToken[pp] = token[p]
    }
    return newToken
  } else {
    log.warn('Invalid token configuration')
  }
}

function checkToken (token) {
  if (token.address) {
    return token
  }
}

process.on('unhandledRejection', err => {
  log.error(err)
  process.exit(1)
})

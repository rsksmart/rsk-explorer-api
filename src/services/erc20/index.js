import Web3 from 'web3'
import config from '../../lib/config.js'
import dataSource from '../../lib/db.js'
import Exporter from './Erc20'
import Logger from '../../lib/Logger'
const log = Logger('Erc20_Service')

const provider = new Web3.providers.HttpProvider(
  'http://' + config.erc20.node + ':' + config.erc20.port
)
const names = config.erc20.names || {}
const tokens = config.erc20.tokens || null
const exporters = {}

if (!tokens) {
  log.warn('There are no tokens in config file')
  process.exit(1)
}

let erc20Config = Object.assign({}, config.erc20)
erc20Config.provider = provider

dataSource.then(db => {
  log.debug('Database Connected')
  const tokensCollection = db.collection(config.erc20.tokenCollection)

  for (let t in tokens) {
    let token = tokens[t]
    let tokenConfig = formatToken(token)
    if (tokenConfig) {
      log.info('TOKEN: ' + JSON.stringify(token))
      let tokenDoc = Object.assign({}, token)
      tokensCollection
        .update(
          { _id: token.address },
          {
            $set: token
          },
          { upsert: true }
        )
        .then(() => {
          tokenConfig = Object.assign(tokenConfig, erc20Config)
          createTokenCollection(db, token).then(collection => {
            exporters[token.address] = new Exporter(tokenConfig, collection)
          })
        })
    }
  }
})

const formatToken = token => {
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

const checkToken = token => {
  if (token.address) {
    return token
  }
}

const createTokenCollection = async (db, token) => {
  const name = config.erc20.dbPrefix + token.address
  log.info('Creating collection: ' + name)
  const collection = db.collection(name)
  log.info('Creating indexes')
  let doc = await collection.createIndexes([
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
  if (!doc.ok) {
    log.error('Error creating indexes')
    // process.exit(1)
  }
  return collection
}

process.on('unhandledRejection', err => {
  log.error(err)
  process.exit(1)
})

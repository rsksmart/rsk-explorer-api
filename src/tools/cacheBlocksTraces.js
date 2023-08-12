
import { setup } from '../lib/dataSource'
import config from '../lib/config'
import { nod3Log } from '.././lib/nod3Connect'
import { Nod3, Nod3Router } from '@rsksmart/nod3'
import BlockTrace from '../services/classes/BlockTrace'
import { Logger } from '../lib/Logger'
import { REPOSITORIES } from '../repositories'

const { BlockTrace: blockTraceRepository } = REPOSITORIES

const { HttpProvider } = Nod3.providers
const log = Logger('cacheTraces', { level: 'trace' })
const { source } = config

const nod3 = createNod3(source)
nod3.setDebug(nod3Log(log))

const { argv } = process

let lowerBlock = argv[2] || 0
let higherBlock = argv[3] || 'latest'
argv[4] = parseInt(argv[4])
const sourcesLen = (Array.isArray(source)) ? source.length : 1
const QUEUE_SIZE = (!isNaN(argv[4])) ? argv[4] : sourcesLen
const requested = {}

if (isNaN(parseInt(lowerBlock))) help(`Invalid lowerBlock value ${argv[2]}`)
if (higherBlock !== 'latest') {
  higherBlock = parseInt(higherBlock)
  if (isNaN(higherBlock)) help(`Invalid lowerBlock value ${argv[3]}`)
  if (higherBlock < lowerBlock) help()
}

main().then(() => {
  log.info('Done')
  process.exit(0)
})

async function main () {
  try {
    const { initConfig } = await setup()
    log.trace(JSON.stringify({ lowBlock: lowerBlock, highBlock: higherBlock }))
    log.info(initConfig.net)

    let block = await nod3.eth.getBlock(higherBlock)
    const tasks = []
    for (let i = 0; i < QUEUE_SIZE; i++) {
      let { hash, parentHash } = block
      tasks.push(getBlocks(hash, { initConfig }))
      block = await nod3.eth.getBlock(parentHash)
    }
    await Promise.all(tasks)
  } catch (err) {
    showErrorAndExit(err)
  }
}

async function getBlocks (hash, opts) {
  try {
    let block = await nod3.eth.getBlock(hash)
    let { number, parentHash } = block
    if (number <= lowerBlock) return
    log.info(`Get trace ${hash}/${number}`)
    let res = await saveBlockTrace(hash, opts)
    if (res) log.info(`Trace ${hash} done`)
    return getBlocks(parentHash, opts)
  } catch (err) {
    return Promise.reject(err)
  }
}

function createNod3 (source) {
  if (Array.isArray(source)) {
    const providers = source.map(({ url }) => new HttpProvider(url))
    const { nod3, router } = new Nod3Router(providers)
    router.reset()
    router.add({ module: 'subscribe', to: 0 })
    return nod3
  } else {
    let nod3 = new Nod3(new HttpProvider(source.url))
    return nod3
  }
}

async function saveBlockTrace (hash, { initConfig }) {
  try {
    if (requested[hash] !== undefined) return
    requested[hash] = false
    log.info(`Waiting for block_trace ${hash}`)
    let blockTrace = new BlockTrace(hash, { nod3, initConfig })
    blockTrace = blockTrace.fetchFromNode()
    await Promise.all(blockTraceRepository.insertOne(blockTrace))
    requested[hash] = true
    return hash
  } catch (err) {
    showErrorAndExit(err)
  }
}

function showErrorAndExit (err) {
  log.error(err)
  process.exit(9)
}

const p = path => path.split('/').pop()

function help (msg) {
  if (msg) {
    log.error(msg)
  }
  const myName = p(process.argv[1])
  log.info(`Use: ${p(process.argv[0])} ${myName} [lowerBlock] [higherBlock] `)
  log.info(`e.g. ${myName} 0 456`)
  process.exit(0)
}


import dataSource from '../lib/dataSource.js'
import { nod3Router as nod3, nod3Log } from '../lib/nod3Connect'
import BlockTrace from '../services/classes/BlockTrace'
import { log } from '../lib/cli'
import { getDbBlocksCollections } from '../lib/blocksCollections'

nod3.setDebug(nod3Log(log))
const { argv } = process

let lowerBlock = argv[2] || 0
let higherBlock = argv[3] || 'latest'

if (isNaN(parseInt(lowerBlock))) help(`Invalid lowerBlock value ${argv[2]}`)
if (higherBlock !== 'latest') {
  higherBlock = parseInt(higherBlock)
  if (isNaN(higherBlock)) help(`Invalid lowerBlock value ${argv[3]}`)
  if (higherBlock < lowerBlock) help()
}

dataSource().then(async ({ db, initConfig }) => {
  const collections = await getDbBlocksCollections(db)
  log.label(JSON.stringify({ lowBlock: lowerBlock, highBlock: higherBlock }))
  log.info(initConfig.net)
  let { number, hash } = await nod3.eth.getBlock(higherBlock)
  await getBlocks({ number, hash }, lowerBlock, { collections, initConfig })
  process.exit(0)
}).catch(err => showError(err))

async function getBlocks (current, low, opts) {
  try {
    let { hash, number } = current
    if (number <= low) return
    let res = await saveBlockTrace(hash, opts)
    return getBlocks({ hash: res.parentHash, number: res.number - 1 }, low, opts)
  } catch (err) {
    showError(err)
  }
}

async function saveBlockTrace (hashOrNumber, { collections, initConfig }) {
  try {
    log.info(hashOrNumber)
    let block = await nod3.eth.getBlock(hashOrNumber)
    let { hash, parentHash, number } = block
    let blockTrace = new BlockTrace(hash, { nod3, collections, initConfig })
    await blockTrace.save()
    return { hash, parentHash, number }
  } catch (err) {
    showError(err)
  }
}

function showError (err) {
  log.error(err)
  process.exit(9)
}

const p = path => path.split('/').pop()

function help (msg) {
  if (msg) {
    log.error(msg)
    console.log()
  }
  const myName = p(process.argv[1])
  log.label(`Use: ${p(process.argv[0])} ${myName} [lowerBlock] [higherBlock] `)
  log.info(`e.g. ${myName} 0 456`)
  process.exit(0)
}

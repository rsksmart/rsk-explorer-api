import dataSource from '../lib/dataSource.js'
import Block from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'
import { info } from '../lib/cli'
import util from 'util'

const hashOrNumber = process.argv[2] || 'latest'
const opt = process.argv[3]
const save = (opt === '--save')
const json = (opt === '--json')
if (!hashOrNumber) help()
dataSource.then(db => {
  if (!json) info(`Getting block ${hashOrNumber}`)
  getBlock(db, hashOrNumber).then(block => {
    if (json) console.log(JSON.stringify(block))
    else {
      console.log(util.inspect(block, { showHidden: false, depth: null, colors: true }))
      console.log('')
      info(` Get time: ${block.time}ms`)
      if (save) info(` Save time: ${block.saved}ms`)
    }
    process.exit(0)
  })
})

async function getBlock (db, hashOrNumber) {
  try {
    let time = getTime()
    let saved = null
    let block = new Block(hashOrNumber, new BlocksBase(db))
    await block.fetch()
    let blockData = block.getData(true)
    time = getTime(time)
    if (save) {
      saved = getTime()
      console.log('Saving Block')
      await block.save()
      saved = getTime(saved)
      console.log('Block Saved')
    }
    return { time, saved, block: blockData }
  } catch (err) {
    console.log(err)
    process.exit(9)
  }
}

function help () {
  info(`Usage: ${process.argv[1]} ${process.argv[1]} number|hash|latest [--json | --save ]`)
  process.exit(0)
}

function getTime (t) {
  return Date.now() - (t || 0)
}

import { Setup } from '../lib/Setup'
import Block from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'
import { log } from '@rsksmart/rsk-js-cli'
import util from 'util'

const number = parseInt(process.argv[2])
const opt = process.argv[3]
const save = (opt === '--save')
const json = (opt === '--json')
if (isNaN(number)) help()
Setup().start().then(({ initConfig }) => {
  if (!json) log.info(`Getting block ${number}`)
  getBlock(number, { initConfig }).then(block => {
    if (json) console.log(JSON.stringify(block))
    else {
      console.log(util.inspect(block, { showHidden: false, depth: null, colors: true }))
      console.log('')
      log.info(` Get time: ${block.time}ms`)
      if (save) log.info(` Save time: ${block.saved}ms`)
    }
    process.exit(0)
  })
})

async function getBlock (number, { initConfig }) {
  try {
    let time = getTime()
    let saved = null
    let block = new Block(number, new BlocksBase({ initConfig }))
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
  const myName = process.argv[1].split('/').pop()
  log.info(`Usage: ${process.argv[0]} ${myName} number [--json | --save ]`)
  process.exit(0)
}

function getTime (t) {
  return Date.now() - (t || 0)
}

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(9)
})

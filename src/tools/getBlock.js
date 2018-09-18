import Block from '../services/classes/Block'
import dataSource from '../lib/dataSource.js'
import conf from '../lib/config'
import blocksCollections from '../lib/collections'
import { Blocks } from '../services/blocks/Blocks'
const config = Object.assign({}, conf.blocks)
const hashOrNumber = process.argv[2] || 'latest'
const opt = process.argv[3]
const save = (opt === '--save')
console.log(`Getting block ${hashOrNumber}`)
dataSource.then(db => {
  const blocks = Blocks(db, config, blocksCollections)
  console.time('block')
  let block = new Block(hashOrNumber, blocks)
  block.fetch().then(blockdata => {
    console.dir(blockdata, { colors: true })
    console.timeEnd('block')
    if (save) {
      console.log('saving block')
      block.save()
        .then(res => console.log('Block saved'))
        .catch(err => console.log(`Error saving block: ${err}`))
    }
  })
})

import Block from '../services/classes/Block'
import BlocksBase from '../lib/BlocksBase'

export async function getBlock (hashOrNumber, { initConfig }) {
  try {
    let block = new Block(hashOrNumber, new BlocksBase({ initConfig }))
    await block.fetch()
    await block.save()
  } catch (err) {
    console.log(err)
    process.exit(9)
  }
}

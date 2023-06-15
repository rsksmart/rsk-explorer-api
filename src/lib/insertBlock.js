import BlocksBase from '../lib/BlocksBase.js'
import Block from '../services/classes/Block.js'

export async function insertBlock ({ number, status, initConfig }) {
  const block = new Block(number, new BlocksBase({ initConfig }), status)
  let fetchingTime = Date.now()
  await block.fetch()
  fetchingTime = Date.now() - fetchingTime

  // insert block
  let savingTime = Date.now()
  await block.save()
  savingTime = Date.now() - savingTime

  console.log(`Block ${number} saved! Fetching: ${fetchingTime} ms. Save time: ${savingTime} ms.`)
}

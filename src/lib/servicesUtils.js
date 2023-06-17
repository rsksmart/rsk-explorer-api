import BlocksBase from './BlocksBase.js'
import Block from '../services/classes/Block.js'
import { blockRepository } from '../repositories/block.repository.js'

export async function insertBlock ({ number, status, initConfig }) {
  const block = new Block(number, new BlocksBase({ initConfig }), status)
  let fetchingTime = Date.now()
  await block.fetch()
  fetchingTime = Date.now() - fetchingTime

  // insert block
  let savingTime = Date.now()
  await block.save()
  savingTime = Date.now() - savingTime

  console.log(`Block ${number} saved! Fetched in ${fetchingTime} ms. Saved in ${savingTime} ms.`)
}

export async function insertBlocks ({ blocks = [], initConfig }) {
  if (blocks.length) {
    console.log(`Saving ${blocks.length} blocks...`)
    blocks.forEach(async number => {
      await insertBlock({ number, initConfig })
    })
  }
}

export const getDbBlock = (number) => blockRepository.findOne({ number })

export const sameHash = (h1, h2) => h1 === h2

export async function deleteBadBlocks (blocks = []) {
  if (blocks.length) {
    console.log(`Deleting ${blocks.length} blocks...`)
    return Promise.all(blocks.map(number => {
      console.log({ numberToDelete: number })
      return blockRepository.deleteBlockData(number)
    }))
  }
}

import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { blockData, erc721, erc1155Batch, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000d0721'
const C1155 = '0x000000000000000000000000000000000d001155'
const [A, B] = ['1', '2'].map(x => `0x${x.repeat(40)}`)
const MODELS_THE_NFT_WRITES_TOUCH = ['token_transfer', 'nft_holder', 'nft_balance', 'block']
const holderAt = (prefix, i) => `0x${prefix}${i.toString(16).padStart(39, '0')}`
const ids = n => Array.from({ length: n }, (_, i) => i + 1)

let operations = 0
let widestOr = 0
const originals = []

function countModelOperations () {
  for (const model of MODELS_THE_NFT_WRITES_TOUCH) {
    const delegate = prismaClient[model]
    for (const name of ['findFirst', 'findMany', 'findUnique', 'groupBy', 'create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']) {
      const original = delegate[name]
      originals.push([delegate, name, original])
      delegate[name] = function (...args) {
        operations++
        if (model === 'nft_balance' && args[0] && args[0].where && args[0].where.OR) widestOr = Math.max(widestOr, args[0].where.OR.length)
        return original.apply(this, args)
      }
    }
  }
}

async function counted (work) {
  operations = 0
  await work()
  return operations
}

const save = (number, logs) => counted(() => blocksRepository.saveBlockData(blockData(number, 'a', logs)))
const remove = number => counted(() => blocksRepository.deleteOne({ number }))

async function batchShape (n) {
  await resetDatabase()
  const all = ids(n)
  const steps = [
    await save(10, [erc1155Batch(C1155, ZERO, A, all, all.map(() => 1))]),
    await save(20, [erc1155Batch(C1155, A, B, all, all.map(() => 1))])
  ]
  expect(await differences()).to.deep.equal([])
  steps.push(await remove(20), await remove(10))
  expect(await differences()).to.deep.equal([])
  return steps
}

async function distinctHolders (n) {
  await resetDatabase()
  const all = ids(n)
  await save(10, all.map(i => erc721(C721, ZERO, holderAt('3', i), i)))
  const moved = await save(20, all.map(i => erc721(C721, holderAt('3', i), holderAt('4', i), i)))
  expect(await differences()).to.deep.equal([])
  const deleted = await remove(20)
  expect(await differences()).to.deep.equal([])
  return { moved, deleted, holders: 2 * n }
}

integrationDescribe('NFT ownership: the statements of a block\'s save and delete grow with holders and bind chunks, not with token ids', function () {
  this.timeout(600000)

  before(countModelOperations)
  after(() => originals.forEach(([delegate, name, original]) => { delegate[name] = original }))

  it('a block\'s save and delete take the same operations for 100 and 1,000 ids, at most one more per added holder on a save and two on a delete, and no balance statement sends more than 400 OR arms', async () => {
    const [fewIds, manyIds] = [await batchShape(100), await batchShape(1000)]
    const [fewHolders, manyHolders] = [await distinctHolders(50), await distinctHolders(500)]
    const addedHolders = manyHolders.holders - fewHolders.holders

    expect(manyIds, `100 ids: ${fewIds} · 1,000 ids: ${manyIds}`).to.deep.equal(fewIds)
    expect(manyHolders.moved - fewHolders.moved, `saves: ${fewHolders.moved} · ${manyHolders.moved}`).to.be.at.most(addedHolders)
    expect(manyHolders.deleted - fewHolders.deleted, `deletes: ${fewHolders.deleted} · ${manyHolders.deleted}`).to.be.at.most(2 * addedHolders)
    expect(widestOr).to.be.within(1, 400)
  })
})

import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { blockData, erc721, erc1155Batch, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000d0721'
const C1155 = '0x000000000000000000000000000000000d001155'
const [A, B] = ['1', '2'].map(digit => `0x${digit.repeat(40)}`)
const MODELS_THE_NFT_WRITES_TOUCH = ['token_transfer', 'nft_holder', 'nft_balance', 'block']
const holderAt = (prefix, i) => `0x${prefix}${i.toString(16).padStart(39, '0')}`
const tokenIds = count => Array.from({ length: count }, (_, i) => i + 1)

let operations = 0
let mostOrConditions = 0
const originals = []

function countModelOperations () {
  for (const model of MODELS_THE_NFT_WRITES_TOUCH) {
    const delegate = prismaClient[model]
    for (const method of ['findFirst', 'findMany', 'findUnique', 'groupBy', 'create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']) {
      const original = delegate[method]
      originals.push([delegate, method, original])
      delegate[method] = function (...args) {
        operations++
        const where = args[0] && args[0].where
        if (model === 'nft_balance' && where && where.OR) mostOrConditions = Math.max(mostOrConditions, where.OR.length)
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
const deleteBlock = number => counted(() => blocksRepository.deleteOne({ number }))

async function operationsPerStepForTokenIds (count) {
  await resetDatabase()
  const ids = tokenIds(count)
  const steps = [
    await save(10, [erc1155Batch(C1155, ZERO, A, ids, ids.map(() => 1))]),
    await save(20, [erc1155Batch(C1155, A, B, ids, ids.map(() => 1))])
  ]
  expect(await differences()).to.deep.equal([])
  steps.push(await deleteBlock(20), await deleteBlock(10))
  expect(await differences()).to.deep.equal([])
  return steps
}

async function operationsForDistinctHolders (count) {
  await resetDatabase()
  const ids = tokenIds(count)
  await save(10, ids.map(i => erc721(C721, ZERO, holderAt('3', i), i)))
  const moved = await save(20, ids.map(i => erc721(C721, holderAt('3', i), holderAt('4', i), i)))
  expect(await differences()).to.deep.equal([])
  const deleted = await deleteBlock(20)
  expect(await differences()).to.deep.equal([])
  return { moved, deleted, holders: 2 * count }
}

integrationDescribe('NFT ownership: the statements of a block\'s save and delete grow with holders and query parameter chunks, not with token ids', function () {
  this.timeout(600000)

  before(countModelOperations)
  after(() => originals.forEach(([delegate, method, original]) => { delegate[method] = original }))

  it('a block\'s save and delete take the same operations for 100 and 1,000 ids, at most one more per added holder on a save and two on a delete, and no balance statement sends more than 400 OR conditions', async () => {
    const [fewIds, manyIds] = [await operationsPerStepForTokenIds(100), await operationsPerStepForTokenIds(1000)]
    const [fewHolders, manyHolders] = [await operationsForDistinctHolders(50), await operationsForDistinctHolders(500)]
    const addedHolders = manyHolders.holders - fewHolders.holders

    expect(manyIds, `100 ids: ${fewIds} · 1,000 ids: ${manyIds}`).to.deep.equal(fewIds)
    expect(manyHolders.moved - fewHolders.moved, `saves: ${fewHolders.moved} · ${manyHolders.moved}`).to.be.at.most(addedHolders)
    expect(manyHolders.deleted - fewHolders.deleted, `deletes: ${fewHolders.deleted} · ${manyHolders.deleted}`).to.be.at.most(2 * addedHolders)
    expect(mostOrConditions).to.be.within(1, 400)
  })
})

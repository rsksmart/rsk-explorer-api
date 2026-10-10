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

async function erc721Shape (n) {
  await resetDatabase()
  const all = ids(n)
  const steps = [
    await save(10, all.map(i => erc721(C721, ZERO, A, i))),
    await save(20, all.map(i => erc721(C721, A, B, i)))
  ]
  expect(await differences()).to.deep.equal([])
  steps.push(await remove(20))
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

  it('a TransferBatch minted to A, moved A to B and deleted again: 100 ids and 1,000 ids take the same operations at every step', async () => {
    const few = await batchShape(100)
    const many = await batchShape(1000)

    expect(many, `100 ids: ${few} · 1,000 ids: ${many}`).to.deep.equal(few)
  })

  it('ERC-721 tokens minted to A, moved A to B and deleted again: 50 tokens and 500 tokens take the same operations at every step', async () => {
    const few = await erc721Shape(50)
    const many = await erc721Shape(500)

    expect(many, `50 tokens: ${few} · 500 tokens: ${many}`).to.deep.equal(few)
  })

  it('ERC-721 transfers between distinct holders: each added holder adds at most one operation to the save', async () => {
    const few = await distinctHolders(50)
    const many = await distinctHolders(500)

    expect(many.moved - few.moved, `50 transfers: ${few.moved} · 500 transfers: ${many.moved}`).to.be.at.most(many.holders - few.holders)
  })

  it('ERC-721 transfers between 1,000 distinct holders: no balance statement sends more than 400 OR arms, past which Postgres plans it in superlinear time', async () => {
    widestOr = 0
    await distinctHolders(500)

    expect(widestOr).to.be.within(1, 400)
  })

  it('deleting ERC-721 transfers between distinct holders: each added holder adds at most two operations, its update and, when no fact is left, its removal', async () => {
    const few = await distinctHolders(50)
    const many = await distinctHolders(500)

    expect(many.deleted - few.deleted, `50 transfers: ${few.deleted} · 500 transfers: ${many.deleted}`).to.be.at.most(2 * (many.holders - few.holders))
  })
})

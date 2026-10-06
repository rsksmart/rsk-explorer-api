import { AsyncLocalStorage } from 'async_hooks'
import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { blockData, blockHashOf, erc721, erc1155Single, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000e0721'
const C1155 = '0x000000000000000000000000000000000e001155'
const [A, B, C] = ['1', '2', '3'].map(x => `0x${x.repeat(40)}`)
const TRIALS = 10

const runBatch = prismaClient.$transaction
const holds = new AsyncLocalStorage()
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const refusals = []
const recordRefusal = error => {
  refusals.push(error.code)
  throw error
}

async function heldBatch (statements, ...rest) {
  const hold = holds.getStore()
  if (!hold || !Array.isArray(statements)) return runBatch.call(prismaClient, statements, ...rest).catch(recordRefusal)
  if (hold.delay) await sleep(hold.delay)
  const held = [...statements]
  if (hold.seconds) held.splice(hold.at === 'end' ? held.length : hold.at, 0, prismaClient.$executeRawUnsafe(`SELECT pg_sleep(${hold.seconds})`))
  return runBatch.call(prismaClient, held, ...rest).catch(recordRefusal)
}

const held = (hold, op) => () => holds.run(hold, op)
const logs721 = (from, to, n, offset = 1) => Array.from({ length: n }, (_, i) => erc721(C721, from, to, offset + i))

async function saveLikeInsertBlock (number, tag, logs) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await blocksRepository.saveBlockData(blockData(number, tag, logs))
    } catch (error) {
      if (await prismaClient.block.findUnique({ where: { number } })) return
      if (attempt === 3) throw error
    }
  }
}

async function replaceLikeInsertBlock (number, tag, logs) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await blocksRepository.saveBlockData(blockData(number, tag, logs), { replace: true })
    } catch (error) {
      const stored = await prismaClient.block.findUnique({ where: { number } })
      if (stored && stored.hash === blockHashOf(number, tag)) return
      if (attempt === 3) throw error
    }
  }
}

const twoBlocksForA = async base => {
  await saveLikeInsertBlock(base + 10, 'a', [erc721(C721, ZERO, A, 1)])
  await saveLikeInsertBlock(base + 30, 'a', [erc721(C721, ZERO, A, 2)])
}

const casesWithAGuaranteedRefusal = [
  'last block: a delete of N against a save of M < N whose transaction stays open across the delete batch',
  'two deletes that both repair the token row, one of two blocks and one of the newer of them',
  'last block: a replace of N against a save of M < N whose transaction stays open across the replace batch'
]

const cases = {
  'two saves of the same block': async base => [
    held({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base, 'a', [...logs721(ZERO, A, 10), erc1155Single(C1155, ZERO, B, 7, 2)])),
    held({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base, 'a', [...logs721(ZERO, A, 10), erc1155Single(C1155, ZERO, B, 7, 2)]))
  ],
  'two saves of adjacent blocks sharing holders': async base => [
    held({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base + 2, 'a', [...logs721(A, B, 20), erc1155Single(C1155, A, C, 1, 1)])),
    held({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base + 1, 'a', [...logs721(ZERO, A, 20), erc1155Single(C1155, ZERO, A, 1, 3)]))
  ],
  'two deletes of the same block': async base => {
    await saveLikeInsertBlock(base, 'a', [...logs721(ZERO, A, 10), erc1155Single(C1155, ZERO, B, 7, 2)])
    await saveLikeInsertBlock(base + 1, 'a', logs721(A, B, 5))
    return [held({ delay: 30 }, () => blocksRepository.deleteOne({ number: base })), held({ delay: 30 }, () => blocksRepository.deleteOne({ number: base }))]
  },
  'a delete of N against a save of N+1 sharing an address': async base => {
    await saveLikeInsertBlock(base, 'a', [...logs721(ZERO, A, 10), erc1155Single(C1155, ZERO, A, 7, 2)])
    return [
      held({ seconds: 0.05, at: 1 }, () => blocksRepository.deleteOne({ number: base })),
      held({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base + 1, 'a', [...logs721(A, B, 5, 100), erc1155Single(C1155, A, B, 7, 1)]))
    ]
  },
  'last block: a delete of N against a save of M < N whose transaction stays open across the delete batch': async base => {
    await twoBlocksForA(base)
    return [
      async () => { await sleep(60); return blocksRepository.deleteOne({ number: base + 30 }) },
      held({ seconds: 0.4, at: 'end' }, () => saveLikeInsertBlock(base + 20, 'a', [erc721(C721, A, B, 1)]))
    ]
  },
  'last block: a replace of N against a save of M < N whose transaction stays open across the replace batch': async base => {
    await twoBlocksForA(base)
    return [
      async () => { await sleep(60); return replaceLikeInsertBlock(base + 30, 'e', [erc721(C721, ZERO, C, 2)]) },
      held({ seconds: 0.4, at: 'end' }, () => saveLikeInsertBlock(base + 20, 'a', [erc721(C721, A, B, 1)]))
    ]
  },
  'last block: a delete of N against a save of M > N sharing the holder': async base => {
    await twoBlocksForA(base)
    return [
      async () => { await sleep(60); return blocksRepository.deleteOne({ number: base + 30 }) },
      held({ seconds: 0.4, at: 'end' }, () => saveLikeInsertBlock(base + 40, 'a', [erc721(C721, A, B, 1)]))
    ]
  },
  'two deletes that both repair the token row, one of two blocks and one of the newer of them': async base => {
    await twoBlocksForA(base)
    await saveLikeInsertBlock(base + 40, 'a', [erc721(C721, ZERO, B, 4)])
    return [
      held({ delay: 80 }, () => blocksRepository.deleteMany({ number: { in: [base + 30, base + 40] } })),
      held({ delay: 80 }, () => blocksRepository.deleteOne({ number: base + 40 }))
    ]
  },
  'last block: two deletes of the holder\'s two newest blocks': async base => {
    await twoBlocksForA(base)
    await saveLikeInsertBlock(base + 40, 'a', [erc721(C721, ZERO, A, 4)])
    return [held({ delay: 80 }, () => blocksRepository.deleteOne({ number: base + 40 })), held({ delay: 80 }, () => blocksRepository.deleteOne({ number: base + 30 }))]
  }
}

integrationDescribe('NFT ownership: concurrent saves and deletes through the repository', function () {
  this.timeout(600000)

  before(() => { prismaClient.$transaction = heldBatch })
  after(() => { prismaClient.$transaction = runBatch })

  for (const [name, setup] of Object.entries(cases)) {
    it(`${name}: every trial equals a replay, and no delete error reaches the caller`, async () => {
      refusals.length = 0
      for (let trial = 0; trial < TRIALS; trial++) {
        await resetDatabase()
        const base = 1000 * (trial + 1)
        const ops = await setup(base)
        const results = await Promise.allSettled(ops.map(op => op()))

        expect(results.filter(r => r.status === 'rejected').map(r => r.reason.code || r.reason.message), `${name} trial ${trial}`).to.deep.equal([])
        expect(await differences(), `${name} trial ${trial}`).to.deep.equal([])
      }
      if (casesWithAGuaranteedRefusal.includes(name)) expect(refusals.filter(code => code === 'P2025')).to.have.lengthOf(TRIALS)
    })
  }
})

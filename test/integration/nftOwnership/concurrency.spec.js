import { AsyncLocalStorage } from 'async_hooks'
import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { blockData, blockHashOf, erc721, erc1155Single, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000e0721'
const C1155 = '0x000000000000000000000000000000000e001155'
const [A, B, C, H] = ['1', '2', '3', '9'].map(digit => `0x${digit.repeat(40)}`)
const TRIALS = 10

const realTransaction = prismaClient.$transaction
const currentHold = new AsyncLocalStorage()
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const refusals = []
function recordRefusal (error) {
  if (error.code) refusals.push(error.code)
  else if (String(error.message).includes('code: "40P01"')) refusals.push('40P01')
  else refusals.push('no code')
  throw error
}

async function transactionWithHold (statements, ...options) {
  const hold = currentHold.getStore()
  if (!hold || !Array.isArray(statements)) {
    return realTransaction.call(prismaClient, statements, ...options).catch(recordRefusal)
  }
  if (hold.delay) await sleep(hold.delay)
  const statementsWithSleep = [...statements]
  if (hold.seconds) {
    const sleepAt = hold.at === 'end' ? statementsWithSleep.length : hold.at
    statementsWithSleep.splice(sleepAt, 0, prismaClient.$executeRawUnsafe(`SELECT pg_sleep(${hold.seconds})`))
  }
  return realTransaction.call(prismaClient, statementsWithSleep, ...options).catch(recordRefusal)
}

const withHold = (hold, operation) => () => currentHold.run(hold, operation)
const erc721Logs = (from, to, count, firstTokenId = 1) =>
  Array.from({ length: count }, (_, i) => erc721(C721, from, to, firstTokenId + i))

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

const saveTwoBlocksForA = async base => {
  await saveLikeInsertBlock(base + 10, 'a', [erc721(C721, ZERO, A, 1)])
  await saveLikeInsertBlock(base + 30, 'a', [erc721(C721, ZERO, A, 2)])
}

const casesWithAGuaranteedRefusal = [
  'last block: a delete of N against a save of M < N whose transaction stays open across the delete batch',
  'two deletes that both repair the token row, one of two blocks and one of the newer of them',
  'last block: a replace of N against a save of M < N whose transaction stays open across the replace batch',
  'no fact left: a delete of N against a save of M < N whose only transfer for the holder is a self-transfer, held open across the delete batch',
  'lock order: a delete of N that repairs the higher-key holder against a save of M between N and the lower holder\'s last block, which holds the lower holder and then takes the higher one'
]

const cases = {
  'two saves of the same block': async base => [
    withHold({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base, 'a', [
      ...erc721Logs(ZERO, A, 10),
      erc1155Single(C1155, ZERO, B, 7, 2)
    ])),
    withHold({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base, 'a', [
      ...erc721Logs(ZERO, A, 10),
      erc1155Single(C1155, ZERO, B, 7, 2)
    ]))
  ],
  'two saves of adjacent blocks sharing holders': async base => [
    withHold({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base + 2, 'a', [
      ...erc721Logs(A, B, 20),
      erc1155Single(C1155, A, C, 1, 1)
    ])),
    withHold({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base + 1, 'a', [
      ...erc721Logs(ZERO, A, 20),
      erc1155Single(C1155, ZERO, A, 1, 3)
    ]))
  ],
  'two deletes of the same block': async base => {
    await saveLikeInsertBlock(base, 'a', [...erc721Logs(ZERO, A, 10), erc1155Single(C1155, ZERO, B, 7, 2)])
    await saveLikeInsertBlock(base + 1, 'a', erc721Logs(A, B, 5))
    return [
      withHold({ delay: 30 }, () => blocksRepository.deleteOne({ number: base })),
      withHold({ delay: 30 }, () => blocksRepository.deleteOne({ number: base }))
    ]
  },
  'a delete of N against a save of N+1 sharing an address': async base => {
    await saveLikeInsertBlock(base, 'a', [...erc721Logs(ZERO, A, 10), erc1155Single(C1155, ZERO, A, 7, 2)])
    return [
      withHold({ seconds: 0.05, at: 1 }, () => blocksRepository.deleteOne({ number: base })),
      withHold({ seconds: 0.05, at: 2 }, () => saveLikeInsertBlock(base + 1, 'a', [
        ...erc721Logs(A, B, 5, 100),
        erc1155Single(C1155, A, B, 7, 1)
      ]))
    ]
  },
  'last block: a delete of N against a save of M < N whose transaction stays open across the delete batch': async base => {
    await saveTwoBlocksForA(base)
    return [
      async () => { await sleep(60); return blocksRepository.deleteOne({ number: base + 30 }) },
      withHold({ seconds: 0.4, at: 'end' }, () => saveLikeInsertBlock(base + 20, 'a', [erc721(C721, A, B, 1)]))
    ]
  },
  'last block: a replace of N against a save of M < N whose transaction stays open across the replace batch': async base => {
    await saveTwoBlocksForA(base)
    return [
      async () => { await sleep(60); return replaceLikeInsertBlock(base + 30, 'e', [erc721(C721, ZERO, C, 2)]) },
      withHold({ seconds: 0.4, at: 'end' }, () => saveLikeInsertBlock(base + 20, 'a', [erc721(C721, A, B, 1)]))
    ]
  },
  'no fact left: a delete of N against a save of M < N whose only transfer for the holder is a self-transfer, held open across the delete batch': async base => {
    await saveLikeInsertBlock(base + 10, 'a', [erc721(C721, ZERO, A, 1)])
    await saveLikeInsertBlock(base + 30, 'a', [erc721(C721, ZERO, H, 2), erc721(C721, H, ZERO, 2)])
    await saveLikeInsertBlock(base + 40, 'a', [erc721(C721, ZERO, A, 9)])
    return [
      async () => { await sleep(60); return blocksRepository.deleteOne({ number: base + 30 }) },
      withHold({ seconds: 0.4, at: 'end' }, () => saveLikeInsertBlock(base + 20, 'a', [erc721(C721, H, H, 5)]))
    ]
  },
  'lock order: a delete of N that repairs the higher-key holder against a save of M between N and the lower holder\'s last block, which holds the lower holder and then takes the higher one': async base => {
    await saveLikeInsertBlock(base + 20, 'a', [erc721(C721, ZERO, A, 1), erc721(C721, ZERO, H, 2)])
    await saveLikeInsertBlock(base + 30, 'a', [erc721(C721, ZERO, A, 3)])
    return [
      async () => { await sleep(60); return blocksRepository.deleteOne({ number: base + 20 }) },
      withHold({ seconds: 0.4, at: 3 }, () => saveLikeInsertBlock(base + 25, 'a', [
        erc721(C721, ZERO, A, 4),
        erc721(C721, ZERO, H, 5)
      ]))
    ]
  },
  'lock order: a delete of N that writes the token rows of two contracts, against a save of M > N that holds the lower contract\'s token and then takes the higher one': async base => {
    await saveLikeInsertBlock(base + 10, 'a', [erc721(C721, ZERO, A, 1), erc1155Single(C1155, ZERO, A, 7, 2)])
    await saveLikeInsertBlock(base + 20, 'a', [erc721(C721, ZERO, A, 2)])
    return [
      withHold({ seconds: 0.6, at: 6 }, () => blocksRepository.deleteOne({ number: base + 10 })),
      async () => {
        await sleep(150)
        return saveLikeInsertBlock(base + 30, 'a', [erc721(C721, ZERO, B, 3), erc1155Single(C1155, ZERO, B, 7, 1)])
      }
    ]
  },
  'last block: a delete of N against a save of M > N sharing the holder': async base => {
    await saveTwoBlocksForA(base)
    return [
      async () => { await sleep(60); return blocksRepository.deleteOne({ number: base + 30 }) },
      withHold({ seconds: 0.4, at: 'end' }, () => saveLikeInsertBlock(base + 40, 'a', [erc721(C721, A, B, 1)]))
    ]
  },
  'two deletes that both repair the token row, one of two blocks and one of the newer of them': async base => {
    await saveTwoBlocksForA(base)
    await saveLikeInsertBlock(base + 40, 'a', [erc721(C721, ZERO, B, 4)])
    return [
      withHold({ delay: 80 }, () => blocksRepository.deleteMany({ number: { in: [base + 30, base + 40] } })),
      withHold({ delay: 80 }, () => blocksRepository.deleteOne({ number: base + 40 }))
    ]
  },
  'last block: two deletes of the holder\'s two newest blocks': async base => {
    await saveTwoBlocksForA(base)
    await saveLikeInsertBlock(base + 40, 'a', [erc721(C721, ZERO, A, 4)])
    return [
      withHold({ delay: 80 }, () => blocksRepository.deleteOne({ number: base + 40 })),
      withHold({ delay: 80 }, () => blocksRepository.deleteOne({ number: base + 30 }))
    ]
  }
}

async function setDefaultIsolation (level) {
  const [{ name }] = await prismaClient.$queryRaw`SELECT current_database() AS name`
  await prismaClient.$executeRawUnsafe(
    `ALTER DATABASE "${name}" ${level ? `SET default_transaction_isolation = '${level}'` : 'RESET default_transaction_isolation'}`
  )
  await prismaClient.$disconnect()
  const [{ default_transaction_isolation: current }] = await prismaClient.$queryRaw`SHOW default_transaction_isolation`
  return current
}

function raceEveryCase () {
  for (const [name, prepare] of Object.entries(cases)) {
    it(`${name}: every trial equals a replay, and no delete error reaches the caller`, async () => {
      refusals.length = 0
      for (let trial = 0; trial < TRIALS; trial++) {
        await resetDatabase()
        const base = 1000 * (trial + 1)
        const operations = await prepare(base)
        const results = await Promise.allSettled(operations.map(operation => operation()))

        expect(
          results.filter(result => result.status === 'rejected').map(result => result.reason.code || result.reason.message),
          `${name} trial ${trial}`
        ).to.deep.equal([])
        expect(await differences(), `${name} trial ${trial}`).to.deep.equal([])
      }
      expect(refusals.filter(code => code === '40P01'), `${name}: deadlocks, including any a retry absorbed`).to.deep.equal([])
      if (casesWithAGuaranteedRefusal.includes(name)) {
        expect(refusals.filter(code => code === 'P2025')).to.have.lengthOf(TRIALS)
      }
    })
  }
}

integrationDescribe('NFT ownership: concurrent saves and deletes through the repository', function () {
  this.timeout(600000)

  before(async () => {
    expect(await setDefaultIsolation(null)).to.equal('read committed')
    prismaClient.$transaction = transactionWithHold
  })
  after(() => { prismaClient.$transaction = realTransaction })

  raceEveryCase()
})

integrationDescribe('NFT ownership: concurrent saves and deletes on a database whose default isolation is repeatable read', function () {
  this.timeout(600000)

  before(async () => {
    expect(await setDefaultIsolation('repeatable read')).to.equal('repeatable read')
    prismaClient.$transaction = transactionWithHold
  })
  after(async () => {
    prismaClient.$transaction = realTransaction
    await setDefaultIsolation(null)
  })

  raceEveryCase()
})

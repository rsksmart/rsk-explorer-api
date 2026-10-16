import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { backfillTransfers, backfillTokenStates, runPhase } from '../../../src/tools/backfillNftOwnership'
import { blockData, blockHashOf, erc721, erc20, erc1155Single, erc1155Batch, tokenStateAt, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences, tableState } from './replay'

const C721 = '0x00000000000000000000000000000000000e0721'
const C1155 = '0x000000000000000000000000000000000e001155'
const C20 = '0x0000000000000000000000000000000000000020'
const [A, B, C] = ['1', '2', '3'].map(x => `0x${x.repeat(40)}`)

const HISTORY = [
  [10, [erc721(C721, ZERO, A, 1), erc721(C721, ZERO, A, 2), erc1155Single(C1155, ZERO, A, 7, 5)]],
  [11, [erc721(C721, A, B, 1), erc20(C20, ZERO, A, 9)]],
  [12, [erc1155Batch(C1155, A, B, [7, 8], [2, 0]), erc721(C721, ZERO, C, 3)]],
  [13, []],
  [14, [erc721(C721, B, C, 1), erc1155Single(C1155, B, C, 7, 1)]],
  [15, [erc721(C721, C, ZERO, 3), erc721(C721, A, C, 2)]],
  [16, [erc1155Single(C1155, A, ZERO, 7, 3)]]
]

const fetcher = ({ failing = () => false } = {}) => ({
  async fetchOne (contract, blockNumber) {
    if (failing(contract, blockNumber)) throw new Error('injected node error')
    return tokenStateAt(contract, blockNumber)
  }
})

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

async function storeAsTheIndexerBeforeTheBackfill (history = HISTORY) {
  for (const [number, logs] of history) await blocksRepository.saveBlockData(blockData(number, 'a', logs))
  await resetDatabase({ keepBlocksAndEvents: true })
}

const phaseA = (options = {}) => backfillTransfers({ fromBlock: 0, toBlock: 100, chunkBlocks: 3, ...options })
const phaseB = (options = {}) => backfillTokenStates({ fromBlock: 0, toBlock: 100, chunkBlocks: 3, fetchers: [fetcher(), fetcher()], ...options })

const runBatch = prismaClient.$transaction
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const killedAtBatch = n => {
  let batches = 0
  prismaClient.$transaction = async (...args) => {
    if (++batches === n) throw new Error('process killed')
    return runBatch.apply(prismaClient, args)
  }
}

integrationDescribe('NFT ownership: the two-phase backfill', function () {
  this.timeout(120000)

  beforeEach(resetDatabase)
  afterEach(() => { prismaClient.$transaction = runBatch })

  it('phase A and phase B over blocks stored before the NFT tables existed equal a replay of their events', async () => {
    await storeAsTheIndexerBeforeTheBackfill()

    const a = await phaseA()
    const b = await phaseB()

    expect(a).to.include({ blocksWritten: 6, blocksAlreadyStored: 0, blocksRaced: 0 })
    expect(b).to.deep.include({ pairs: 9, pairsWritten: 9, pairsFailed: [] })
    expect(await differences()).to.deep.equal([])
  })

  it('a second run from the first block and a run from a middle block leave the same tables', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await phaseA()
    await phaseB()
    const first = await tableState()

    const again = [await phaseA(), await phaseB(), await phaseA({ fromBlock: 12 }), await phaseB({ fromBlock: 14 })]

    expect(again.map(r => r.blocksWritten || r.pairsWritten || 0)).to.deep.equal([0, 0, 0, 0])
    expect(await tableState()).to.deep.equal(first)
  })

  it('fills only the blocks the live path did not write, whatever their order', async () => {
    await storeAsTheIndexerBeforeTheBackfill(HISTORY.filter(([number]) => number % 2 === 0))
    for (const [number, logs] of HISTORY.filter(([number]) => number % 2 === 1)) await blocksRepository.saveBlockData(blockData(number, 'a', logs))

    const a = await phaseA()
    const b = await phaseB()

    expect(a).to.include({ blocksWritten: 4, blocksAlreadyStored: 2 })
    expect(b).to.include({ pairsAlreadyStored: 2, pairsWritten: 7 })
    expect(await differences()).to.deep.equal([])
  })

  it('phase A and phase B each killed after a block committed, then run again with no arguments, equal a replay', async () => {
    await storeAsTheIndexerBeforeTheBackfill()

    killedAtBatch(3)
    const killedA = await runPhase({ phase: 'A', chunkBlocks: 3 }).catch(error => error)
    const factsAfterKilledA = await prismaClient.token_transfer.count()
    prismaClient.$transaction = runBatch
    const rerunA = await runPhase({ phase: 'A', chunkBlocks: 3 })

    killedAtBatch(5)
    const killedB = await runPhase({ phase: 'B', chunkBlocks: 3, fetchers: [fetcher()] }).catch(error => error)
    const statesAfterKilledB = await prismaClient.token_state_at_block.count()
    prismaClient.$transaction = runBatch
    const rerunB = await runPhase({ phase: 'B', chunkBlocks: 3, fetchers: [fetcher()] })

    expect([killedA.message, killedB.message]).to.deep.equal(['process killed', 'process killed'])
    expect([factsAfterKilledA, statesAfterKilledB]).to.deep.equal([4, 7])
    expect(rerunA).to.include({ blocksAlreadyStored: 2, blocksWritten: 4 })
    expect(rerunB).to.include({ pairsAlreadyStored: 7, pairsWritten: 2 })
    expect(await differences()).to.deep.equal([])
  })

  it('a run against a database it has not seen writes every block and pair, whatever ran before from the same working directory', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await runPhase({ phase: 'A', chunkBlocks: 3 })
    await runPhase({ phase: 'B', chunkBlocks: 3, fetchers: [fetcher()] })
    await resetDatabase()
    await storeAsTheIndexerBeforeTheBackfill()

    const a = await runPhase({ phase: 'A', chunkBlocks: 3 })
    const b = await runPhase({ phase: 'B', chunkBlocks: 3, fetchers: [fetcher()] })

    expect(a).to.include({ blocksWritten: 6, blocksAlreadyStored: 0 })
    expect(b).to.deep.include({ pairs: 9, pairsWritten: 9, pairsFailed: [] })
    expect(await differences()).to.deep.equal([])
  })

  it('phase B skips a block deleted between its pair read and its write, and the tables equal a replay', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await phaseA()
    let deleted = false
    prismaClient.$transaction = async function racing (...args) {
      if (!deleted) {
        deleted = true
        prismaClient.$transaction = runBatch
        await blocksRepository.deleteOne({ number: 11 })
        prismaClient.$transaction = racing
      }
      return runBatch.apply(prismaClient, args)
    }

    const b = await phaseB({ chunkBlocks: 10 })

    expect(b.pairsRaced).to.equal(1)
    expect(await prismaClient.block.count({ where: { number: 11 } })).to.equal(0)
    expect(await differences()).to.deep.equal([])
  })

  it('phase B stores no state for a block replaced while it reads that block\'s pairs, and the tables equal a replay', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await phaseA()
    let replaced = false
    const replacingBlock11 = {
      async fetchOne (contract, blockNumber) {
        if (!replaced && contract === C721 && blockNumber === 11) {
          replaced = true
          await blocksRepository.saveBlockData(blockData(11, 'b', []), { replace: true })
        }
        return tokenStateAt(contract, blockNumber)
      }
    }

    const b = await phaseB({ chunkBlocks: 10, fetchers: [replacingBlock11] })

    expect(replaced).to.equal(true)
    expect(await prismaClient.token_state_at_block.count({ where: { blockNumber: 11 } })).to.equal(0)
    expect(b).to.include({ pairsRaced: 1, pairsWritten: 8 })
    expect(await differences()).to.deep.equal([])
  })

  it('phase B holds its block\'s row from the pin to the commit: a replace that starts inside that batch waits for it, and the tables equal a replay', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await phaseA()
    let replacing = null
    let batches = 0
    prismaClient.$transaction = async (statements, ...rest) => {
      if (Array.isArray(statements) && ++batches === 2) {
        replacing = sleep(150).then(() => {
          prismaClient.$transaction = runBatch
          return replaceLikeInsertBlock(11, 'b', [])
        })
        return runBatch.call(prismaClient, [statements[0], prismaClient.$executeRawUnsafe('SELECT pg_sleep(0.6)'), ...statements.slice(1)], ...rest)
      }
      return runBatch.call(prismaClient, statements, ...rest)
    }

    await phaseB({ chunkBlocks: 10, fetchers: [fetcher()] })
    await replacing

    expect((await prismaClient.block.findUnique({ where: { number: 11 } })).hash).to.equal(blockHashOf(11, 'b'))
    expect(await differences()).to.deep.equal([])
  })

  it('phase B re-reads its block after a second phase B stored part of its pairs (P2002), stores the rest, and the tables equal a replay', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await phaseA()
    const codes = []
    let raced = false
    prismaClient.$transaction = async function racing (...args) {
      if (!raced) {
        raced = true
        prismaClient.$transaction = runBatch
        await phaseB({ fetchers: [fetcher({ failing: (contract, blockNumber) => contract === C721 && blockNumber === 10 })] })
        prismaClient.$transaction = racing
      }
      return runBatch.apply(prismaClient, args).catch(error => {
        codes.push(error.code)
        throw error
      })
    }

    const b = await phaseB({ chunkBlocks: 10 })

    expect(await differences()).to.deep.equal([])
    expect(codes).to.deep.equal(Array(6).fill('P2002'))
    expect(b).to.include({ pairs: 9, pairsRaced: 6, pairsWritten: 1 })
  })

  it('phase A skips a block deleted between its event read and its write', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    let deleted = false
    prismaClient.$transaction = async function racing (...args) {
      if (!deleted) {
        deleted = true
        prismaClient.$transaction = runBatch
        await prismaClient.block.delete({ where: { number: 10 } })
        prismaClient.$transaction = racing
      }
      return runBatch.apply(prismaClient, args)
    }

    const a = await phaseA()
    prismaClient.$transaction = runBatch
    await phaseB()

    expect(a).to.include({ blocksRaced: 1, blocksWritten: 5 })
    expect(await differences()).to.deep.equal([])
  })

  it('phase B stores no pair whose read failed, reports it, and a later run fills it', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await phaseA()
    const failing = (contract, blockNumber) => contract === C721 && blockNumber === 12

    const b = await phaseB({ fetchers: [fetcher({ failing })] })

    expect(b.pairsFailed.map(p => [p.contract, p.blockNumber, p.failure])).to.deep.equal([[C721, 12, 'injected node error']])
    expect(b).to.include({ pairsWritten: 8 })
    expect(await prismaClient.token_state_at_block.count({ where: { contract: C721, blockNumber: 12 } })).to.equal(0)

    const rerun = await phaseB()
    expect(rerun).to.include({ pairsWritten: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('both phases run without arguments on a database with no block read nothing and finish, instead of refusing the range 0..-1', async () => {
    const [a, b] = [await runPhase({ phase: 'A' }), await runPhase({ phase: 'B', fetchers: [fetcher()] })]

    expect([a.blocksRead, a.blocksWritten, b.blocksRead, b.pairsWritten]).to.deep.equal([0, 0, 0, 0])
  })

  it('a phase given a fromBlock on a database with no block refuses the range and says no block is stored', async () => {
    const error = await runPhase({ phase: 'A', fromArg: 0 }).catch(e => e)

    expect(error.message).to.equal('fromBlock 0 is above every stored block (no block is stored): the range is empty')
  })

  it('a phase B run before phase A has finished, then both phases run again, equal a replay: A from 14, B, A, B', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    const phase = (name, fromArg) => runPhase({ phase: name, fromArg, chunkBlocks: 3, fetchers: [fetcher()] })

    await phase('A', 14)
    const early = await phase('B')
    await phase('A')
    const late = await phase('B')

    expect(early).to.include({ pairs: 4, pairsWritten: 4 })
    expect(late).to.include({ pairsAlreadyStored: 4, pairsWritten: 5 })
    expect(await differences()).to.deep.equal([])
  })
})

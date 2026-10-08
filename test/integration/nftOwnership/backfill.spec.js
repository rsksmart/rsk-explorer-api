import { expect } from 'chai'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { backfillTransfers, backfillTokenStates, runPhase, readResume, writeResume } from '../../../src/tools/backfillNftOwnership'
import { blockData, erc721, erc20, erc1155Single, erc1155Batch, tokenStateAt, ZERO } from './fixtures'
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
const NFT_TABLES = 'nft_balance, nft_holder, token_transfer, token_state_at_block, token'

const clean = () => ({ calls: 13, reverts: 0, nodeErrors: 0, tokenReadErrors: 0, lastNodeError: null })
const fetcher = ({ failing = () => false } = {}) => {
  let last = clean()
  return {
    async fetchOne (contract, blockNumber) {
      last = failing(contract, blockNumber) ? { ...clean(), nodeErrors: 1, tokenReadErrors: 1, lastNodeError: 'injected internal error' } : clean()
      return tokenStateAt(contract, blockNumber)
    },
    takeStats: () => last
  }
}

async function storeAsTheIndexerBeforeTheBackfill (history = HISTORY) {
  for (const [number, logs] of history) await blocksRepository.saveBlockData(blockData(number, 'a', logs))
  await prismaClient.$executeRawUnsafe(`TRUNCATE ${NFT_TABLES}`)
}

const phaseA = (options = {}) => backfillTransfers({ fromBlock: 0, toBlock: 100, chunkBlocks: 3, ...options })
const phaseB = (options = {}) => backfillTokenStates({ fromBlock: 0, toBlock: 100, chunkBlocks: 3, fetchers: [fetcher(), fetcher()], ...options })

const runBatch = prismaClient.$transaction
const markerIn = phase => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'backfill-marker-')), `backfill-nft-ownership-${phase}.resume`)

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

  it('phase B killed after a block of a chunk committed resumes from its marker with no duplicate and no gap', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await phaseA()
    const markers = []
    let writes = 0
    prismaClient.$transaction = async (...args) => {
      if (++writes === 5) throw new Error('process killed')
      return runBatch.apply(prismaClient, args)
    }

    const killed = await phaseB({ onChunkDone: ({ nextBlock }) => markers.push(nextBlock) }).catch(error => error)
    prismaClient.$transaction = runBatch
    const resumed = await phaseB({ fromBlock: markers[markers.length - 1] })

    expect(killed.message).to.equal('process killed')
    expect(markers).to.deep.equal([13])
    expect(resumed).to.include({ pairsAlreadyStored: 2, pairsWritten: 2 })
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

  it('phase B never stores a pair whose reads saw a node error, retries it, and a later run fills it', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await phaseA()
    const completeness = []
    const failing = (contract, blockNumber) => contract === C721 && blockNumber === 12

    const b = await phaseB({ fetchers: [fetcher({ failing })], onChunkDone: ({ complete }) => completeness.push(complete) })

    expect(b.pairsFailed.map(p => [p.contract, p.blockNumber, p.nodeErrorsPerAttempt])).to.deep.equal([[C721, 12, [1, 1, 1]]])
    expect(b).to.include({ pairsWritten: 8, nodeErrors: 3, tokenReadErrors: 3, firstAttemptTokenReadErrors: 1 })
    expect(completeness).to.deep.equal([false, true, true])
    expect(await prismaClient.token_state_at_block.count({ where: { contract: C721, blockNumber: 12 } })).to.equal(0)

    const rerun = await phaseB()
    expect(rerun).to.include({ pairsWritten: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('a phase B run holds its marker before a chunk with an unstored pair, and the next default run reads it back and fills the pair', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    await phaseA()
    const markerFile = markerIn('B')
    writeResume(markerFile, 10)
    const failing = (contract, blockNumber) => contract === C721 && blockNumber === 12

    const first = await runPhase({ phase: 'B', chunkBlocks: 3, markerFile, fetchers: [fetcher({ failing })] })
    const markerAfterFirst = readResume(markerFile)
    const second = await runPhase({ phase: 'B', chunkBlocks: 3, markerFile, fetchers: [fetcher()] })

    expect(first.pairsFailed).to.have.length(1)
    expect(markerAfterFirst).to.equal(10)
    expect(second).to.include({ pairsWritten: 1 })
    expect(readResume(markerFile)).to.equal(17)
    expect(await differences()).to.deep.equal([])
  })

  it('a run started above the marker leaves it, so the next default run fills every block below: A 14, then A', async () => {
    await storeAsTheIndexerBeforeTheBackfill()
    const markerFile = markerIn('A')

    const above = await runPhase({ phase: 'A', fromArg: 14, chunkBlocks: 3, markerFile })
    const markerAfterAbove = readResume(markerFile)
    const byDefault = await runPhase({ phase: 'A', chunkBlocks: 3, markerFile })
    await phaseB()

    expect(await differences()).to.deep.equal([])
    expect(above).to.include({ blocksWritten: 3 })
    expect(markerAfterAbove).to.equal(null)
    expect(byDefault).to.include({ blocksWritten: 3, blocksAlreadyStored: 3 })
  })
})

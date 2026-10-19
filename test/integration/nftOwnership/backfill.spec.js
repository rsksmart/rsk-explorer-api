import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { backfillTransfers, backfillTokenStates, runPhase } from '../../../src/tools/backfillNftOwnership'
import { blockData, erc721, erc20, erc1155Single, erc1155Batch, tokenStateAt, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

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

async function storeAsTheIndexerBeforeTheBackfill () {
  for (const [number, logs] of HISTORY) await blocksRepository.saveBlockData(blockData(number, 'a', logs))
  await resetDatabase({ keepBlocksAndEvents: true })
}

const phaseA = (options = {}) => backfillTransfers({ fromBlock: 0, toBlock: 100, chunkBlocks: 3, ...options })
const phaseB = (options = {}) => backfillTokenStates({ fromBlock: 0, toBlock: 100, chunkBlocks: 3, fetchers: [fetcher(), fetcher()], ...options })

const runBatch = prismaClient.$transaction
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
})

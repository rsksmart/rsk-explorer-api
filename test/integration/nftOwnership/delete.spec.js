import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository, tokenStateRepository } from '../../../src/repositories'
import { blockData, blockHashOf, erc721, erc20, erc1155Single, tokenStateAt, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000e0721'
const C1155 = '0x000000000000000000000000000000000e001155'
const C20 = '0x0000000000000000000000000000000000000020'
const [A, B, C, H] = ['1', '2', '3', '9'].map(x => `0x${x.repeat(40)}`)

const save = (number, tag, logs) => blocksRepository.saveBlockData(blockData(number, tag, logs))
const nftContracts = n => Array.from({ length: n }, (_, i) => `0x${(0xe0721 + i).toString(16).padStart(40, '0')}`)

async function stateReadsOfADeleteRepairing (contracts) {
  await resetDatabase()
  await save(10, 'a', contracts.map(contract => erc721(contract, ZERO, A, 1)))
  await save(30, 'a', contracts.map(contract => erc721(contract, A, B, 1)))
  const delegate = prismaClient.token_state_at_block
  const originals = ['findFirst', 'findMany', 'groupBy'].map(name => [name, delegate[name]])
  let reads = 0
  for (const [name, original] of originals) delegate[name] = function (...args) { reads++; return original.apply(this, args) }

  try {
    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 1 })
  } finally {
    for (const [name, original] of originals) delegate[name] = original
  }
  expect(await differences()).to.deep.equal([])
  return reads
}

const runBatch = prismaClient.$transaction

function beforeTheNextBatch (concurrentWork) {
  let pending = true
  prismaClient.$transaction = async (...args) => {
    if (pending) {
      pending = false
      await concurrentWork()
    }
    return runBatch.apply(prismaClient, args)
  }
}

integrationDescribe('NFT ownership: the repository block delete', function () {
  this.timeout(120000)

  beforeEach(resetDatabase)
  afterEach(() => { prismaClient.$transaction = runBatch })

  it('returns the number of blocks deleted, 0 for a missing block', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(20, 'a', [])

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 0 })
    expect(await blocksRepository.deleteMany({ number: { in: [10, 20, 30] } })).to.deep.equal({ count: 2 })
    expect(await prismaClient.block.count()).to.equal(0)
  })

  it('a delete that bypasses the repository fails on the Restrict key of a block with NFT facts or token state facts', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(20, 'a', [erc20(C20, ZERO, A, 5)])
    await save(30, 'a', [])
    await prismaClient.$transaction(tokenStateRepository.insertStatements({ number: 30 }, [tokenStateAt(C721, 30)]))

    const errors = await Promise.all([10, 30].map(number => prismaClient.block.deleteMany({ where: { number } }).catch(e => e)))
    expect(errors.map(e => e.code)).to.deep.equal(['P2003', 'P2003'])
    expect(await prismaClient.block.deleteMany({ where: { number: 20 } })).to.deep.equal({ count: 1 })
  })

  it('fails the batch instead of deleting a holder whose last fact goes while its stored sum is not zero, and changes nothing', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    const key = { contract_standard_holder: { contract: C721, standard: 'ERC721', holder: A } }
    await prismaClient.nft_holder.update({ where: key, data: { quantity: 5 } })

    const error = await blocksRepository.deleteOne({ number: 10 }).catch(e => e)

    expect(error.code).to.equal('P2025')
    expect(await prismaClient.block.count({ where: { number: 10 } })).to.equal(1)
    expect(await prismaClient.nft_holder.findUnique({ where: key })).to.include({ tokenCount: 1n }).and.satisfy(holder => holder.quantity.toFixed() === '5')
  })

  it('fails the batch instead of deleting a holder whose last fact goes while its stored token count is not zero, and changes nothing', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    const key = { contract_standard_holder: { contract: C721, standard: 'ERC721', holder: A } }
    await prismaClient.nft_holder.update({ where: key, data: { tokenCount: 2 } })

    const error = await blocksRepository.deleteOne({ number: 10 }).catch(e => e)

    expect(error.code).to.equal('P2025')
    expect(await prismaClient.block.count({ where: { number: 10 } })).to.equal(1)
    expect(await prismaClient.nft_holder.findUnique({ where: key })).to.include({ tokenCount: 2n }).and.satisfy(holder => holder.quantity.toFixed() === '1')
  })

  it('keeps the newest last block when an older block is saved after a newer one', async () => {
    await save(30, 'a', [erc721(C721, ZERO, A, 1)])
    await save(10, 'a', [erc721(C721, ZERO, A, 2)])

    const holder = await prismaClient.nft_holder.findFirst({ where: { holder: A } })
    expect(holder.lastBlockNumber).to.equal(30)
    expect(await differences()).to.deep.equal([])
  })

  it('repairs the last block when a save of an older block lands between the delete read and its batch', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, ZERO, A, 2)])
    beforeTheNextBatch(() => save(20, 'a', [erc721(C721, A, B, 1)]))

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 1 })

    const holder = await prismaClient.nft_holder.findFirst({ where: { holder: A } })
    expect(holder.lastBlockNumber).to.equal(20)
    expect(await differences()).to.deep.equal([])
  })

  it('repairs the holder row when it is the only row a concurrent older save touched', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, ZERO, A, 2)])
    await save(40, 'a', [erc721(C721, ZERO, B, 5)])
    beforeTheNextBatch(() => save(20, 'a', [erc721(C721, A, B, 1)]))

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 1 })

    const holder = await prismaClient.nft_holder.findFirst({ where: { holder: A } })
    expect(holder.lastBlockNumber).to.equal(20)
    expect(await differences()).to.deep.equal([])
  })

  it('repairs the token row when it is the only row a concurrent older save touched', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, ZERO, A, 2)])
    beforeTheNextBatch(() => save(20, 'a', [erc721(C721, ZERO, B, 3)]))

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 1 })

    const token = await prismaClient.token.findUnique({ where: { contract: C721 } })
    expect(token.blockNumber).to.equal(20)
    expect(await differences()).to.deep.equal([])
  })

  it('repairs the token rows of six contracts with as many state reads as one', async () => {
    const one = await stateReadsOfADeleteRepairing(nftContracts(1))
    const six = await stateReadsOfADeleteRepairing(nftContracts(6))

    expect(six, `1 contract: ${one} reads · 6 contracts: ${six} reads`).to.equal(one)
  })

  it('repairs the token row from a fresh read when the block holding its newest other state is deleted between the repair\'s two reads', async () => {
    const [K, M] = [`0x${'1'.repeat(40)}`, `0x${'2'.repeat(40)}`]
    await save(10, 'a', [erc721(C721, ZERO, K, 1)])
    await save(20, 'a', [erc721(C721, ZERO, M, 2)])
    await save(30, 'a', [erc721(C721, ZERO, H, 3)])
    const delegate = prismaClient.token_state_at_block
    const findMany = delegate.findMany
    let pending = true
    delegate.findMany = async function (...args) {
      if (pending && args[0] && args[0].where && args[0].where.OR) {
        pending = false
        await blocksRepository.deleteOne({ number: 20 })
      }
      return findMany.apply(this, args)
    }

    try {
      expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 1 })
    } finally {
      delegate.findMany = findMany
    }
    expect(pending).to.equal(false)
    expect(await prismaClient.token.findUnique({ where: { contract: C721 }, select: { blockNumber: true } })).to.deep.equal({ blockNumber: 10 })
    expect(await differences()).to.deep.equal([])
  })

  it('fails the delete, and keeps the block, when the newest other state is deleted between the repair\'s two reads on all three attempts', async () => {
    const holders = ['1', '2', '3', '9'].map(x => `0x${x.repeat(40)}`)
    for (const [i, number] of [5, 10, 20, 30].entries()) await save(number, 'a', [erc721(C721, ZERO, holders[i], number)])
    const delegate = prismaClient.token_state_at_block
    const findMany = delegate.findMany
    const deletedBetweenReads = []
    delegate.findMany = async function (...args) {
      const pair = args[0] && args[0].where && args[0].where.OR && args[0].where.OR[0]
      if (pair && deletedBetweenReads.length < 3) {
        deletedBetweenReads.push(pair.blockNumber)
        await blocksRepository.deleteOne({ number: pair.blockNumber })
      }
      return findMany.apply(this, args)
    }

    const error = await blocksRepository.deleteOne({ number: 30 }).catch(e => e).finally(() => { delegate.findMany = findMany })

    expect(deletedBetweenReads).to.deep.equal([20, 10, 5])
    expect(error.message).to.equal('the newest token state facts of 1 contract(s) were deleted between their two reads on each of 3 attempts')
    expect(await prismaClient.block.count({ where: { number: 30 } })).to.equal(1)
  })

  it('deletes the state fact of a contract whose token row points at a later block', async () => {
    await save(20, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, A, B, 1)])

    expect(await blocksRepository.deleteOne({ number: 20 })).to.deep.equal({ count: 1 })

    expect(await prismaClient.token_state_at_block.findMany({ select: { blockNumber: true } })).to.deep.equal([{ blockNumber: 30 }])
    expect(await differences()).to.deep.equal([])
  })

  it('deletes the state facts of every block of a multi-block delete, whichever block each contract\'s token row points at', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1), erc1155Single(C1155, ZERO, A, 7, 2)])
    await save(20, 'a', [erc721(C721, A, B, 1), erc1155Single(C1155, A, B, 7, 1)])
    await save(30, 'a', [erc721(C721, ZERO, C, 2)])
    await save(40, 'a', [erc721(C721, ZERO, H, 3)])

    expect(await blocksRepository.deleteMany({ number: { in: [20, 30] } })).to.deep.equal({ count: 2 })

    expect(await prismaClient.token_state_at_block.count({ where: { blockNumber: { in: [20, 30] } } })).to.equal(0)
    expect(await differences()).to.deep.equal([])
  })

  it('replaces a block whose state fact belongs to a contract with a later token row, writing the new fact at the same number', async () => {
    await save(30, 'a', [erc721(C721, ZERO, A, 1)])
    await save(40, 'a', [erc721(C721, ZERO, B, 2)])

    await blocksRepository.saveBlockData(blockData(30, 'e', [erc721(C721, ZERO, C, 1)]), { replace: true })

    expect((await prismaClient.block.findUnique({ where: { number: 30 } })).hash).to.equal(blockHashOf(30, 'e'))
    expect(await prismaClient.token_state_at_block.count({ where: { blockNumber: 30 } })).to.equal(1)
    expect(await differences()).to.deep.equal([])
  })

  it('saves and deletes an NFT transfer at log index 4096, whose event id is 33 characters long', async () => {
    const data = blockData(10, 'a', [erc721(C721, ZERO, A, 1)], { firstLogIndex: 4096 })
    expect(data.events[0].eventId).to.have.lengthOf(33)

    await blocksRepository.saveBlockData(data)
    expect(await differences()).to.deep.equal([])
    expect(await blocksRepository.deleteOne({ number: 10 })).to.deep.equal({ count: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('never deletes a block replaced between the delete read and its batch', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, ZERO, A, 2)])
    beforeTheNextBatch(async () => {
      await blocksRepository.deleteOne({ number: 30 })
      await save(30, 'e', [erc721(C721, ZERO, C, 3)])
    })

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 0 })

    const stored = await prismaClient.block.findUnique({ where: { number: 30 } })
    expect(stored.hash).to.equal(blockHashOf(30, 'e'))
    expect(await differences()).to.deep.equal([])
  })

  it('absorbs a second delete of the same block that commits first', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, ZERO, A, 2)])
    let concurrent
    beforeTheNextBatch(async () => { concurrent = await blocksRepository.deleteOne({ number: 30 }) })

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 0 })
    expect(concurrent).to.deep.equal({ count: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('keeps a holder that a concurrent older save names only in a self-transfer, once the delete leaves it no other fact', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, ZERO, H, 2), erc721(C721, H, ZERO, 2)])
    await save(40, 'a', [erc721(C721, ZERO, A, 9)])
    beforeTheNextBatch(() => save(20, 'a', [erc721(C721, H, H, 5)]))

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('keeps a holder that a concurrent older save names only in a zero-value TransferSingle, once the delete leaves it no other fact', async () => {
    await save(10, 'a', [erc1155Single(C1155, ZERO, A, 1, 1)])
    await save(30, 'a', [erc1155Single(C1155, ZERO, H, 2, 1), erc1155Single(C1155, H, ZERO, 2, 1)])
    await save(40, 'a', [erc1155Single(C1155, ZERO, A, 9, 1)])
    beforeTheNextBatch(() => save(20, 'a', [erc1155Single(C1155, A, H, 1, 0)]))

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('never deletes a replacement of a block with no NFT fact', async () => {
    await save(10, 'a', [])
    await save(30, 'a', [])
    beforeTheNextBatch(async () => {
      await blocksRepository.deleteOne({ number: 30 })
      await save(30, 'e', [])
    })

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 0 })
    const stored = await prismaClient.block.findUnique({ where: { number: 30 } })
    expect(stored.hash).to.equal(blockHashOf(30, 'e'))
  })

  it('counts only the blocks it deleted when one of a set vanished before its batch', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, ZERO, A, 2)])
    beforeTheNextBatch(() => blocksRepository.deleteOne({ number: 30 }))

    expect(await blocksRepository.deleteMany({ number: { in: [10, 30] } })).to.deep.equal({ count: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('replaces a block with NFT facts in place, every new table equal to a replay', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, A, B, 1), erc721(C721, ZERO, C, 2), erc1155Single(C1155, ZERO, H, 7, 3)])
    await save(40, 'a', [erc721(C721, ZERO, A, 9)])

    await blocksRepository.saveBlockData(blockData(30, 'e', [erc721(C721, A, C, 1), erc1155Single(C1155, ZERO, B, 8, 2)]), { replace: true })

    const stored = await prismaClient.block.findUnique({ where: { number: 30 } })
    expect(stored.hash).to.equal(blockHashOf(30, 'e'))
    expect(await differences()).to.deep.equal([])
  })
})

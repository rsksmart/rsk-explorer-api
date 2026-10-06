import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { blockData, blockHashOf, erc721, erc20, erc1155Single, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000e0721'
const C1155 = '0x000000000000000000000000000000000e001155'
const C20 = '0x0000000000000000000000000000000000000020'
const [A, B, C, H] = ['1', '2', '3', '9'].map(x => `0x${x.repeat(40)}`)

const save = (number, tag, logs) => blocksRepository.saveBlockData(blockData(number, tag, logs))

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

  it('a delete that bypasses the repository fails on the Restrict key of a block with NFT facts', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(20, 'a', [erc20(C20, ZERO, A, 5)])

    const error = await prismaClient.block.deleteMany({ where: { number: 10 } }).catch(e => e)
    expect(error.code).to.equal('P2003')
    expect(await prismaClient.block.deleteMany({ where: { number: 20 } })).to.deep.equal({ count: 1 })
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
})

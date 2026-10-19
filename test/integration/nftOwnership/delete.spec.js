import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository, tokenStateRepository } from '../../../src/repositories'
import { blockData, blockHashOf, erc721, erc20, erc1155Single, tokenStateAt, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000e0721'
const C1155 = '0x000000000000000000000000000000000e001155'
const C20 = '0x0000000000000000000000000000000000000020'
const [A, B, C, H] = ['1', '2', '3', '9'].map(digit => `0x${digit.repeat(40)}`)

const save = (number, tag, logs) => blocksRepository.saveBlockData(blockData(number, tag, logs))

const realTransaction = prismaClient.$transaction

function beforeTheNextTransaction (concurrentWork) {
  let notRunYet = true
  prismaClient.$transaction = async (...args) => {
    if (notRunYet) {
      notRunYet = false
      await concurrentWork()
    }
    return realTransaction.apply(prismaClient, args)
  }
}

integrationDescribe('NFT ownership: the repository block delete', function () {
  this.timeout(120000)

  beforeEach(resetDatabase)
  afterEach(() => { prismaClient.$transaction = realTransaction })

  it('a delete that bypasses the repository fails on the Restrict key of a block with NFT facts or token state facts', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(20, 'a', [erc20(C20, ZERO, A, 5)])
    await save(30, 'a', [])
    await prismaClient.$transaction(tokenStateRepository.insertStatements({ number: 30 }, [tokenStateAt(C721, 30)]))

    const errors = await Promise.all([10, 30].map(number => prismaClient.block.deleteMany({ where: { number } }).catch(error => error)))
    expect(errors.map(error => error.code)).to.deep.equal(['P2003', 'P2003'])
    expect(await prismaClient.block.deleteMany({ where: { number: 20 } })).to.deep.equal({ count: 1 })
  })

  it('fails the batch instead of deleting a holder whose last fact goes while its stored sum or token count is not zero, and changes nothing', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    const holderKey = { contract_standard_holder: { contract: C721, standard: 'ERC721', holder: A } }

    for (const notZero of [{ quantity: '5', tokenCount: BigInt(1) }, { quantity: '1', tokenCount: BigInt(2) }]) {
      await prismaClient.nft_holder.update({ where: holderKey, data: notZero })
      const error = await blocksRepository.deleteOne({ number: 10 }).catch(refusal => refusal)

      expect(error.code).to.equal('P2025')
      expect(await prismaClient.block.count({ where: { number: 10 } })).to.equal(1)
      const holder = await prismaClient.nft_holder.findUnique({ where: holderKey })
      expect([holder.quantity.toFixed(), holder.tokenCount]).to.deep.equal([notZero.quantity, notZero.tokenCount])
    }
  })

  it('repairs the last block when a save of an older block lands between the delete read and its batch', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, ZERO, A, 2)])
    beforeTheNextTransaction(() => save(20, 'a', [erc721(C721, A, B, 1)]))

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 1 })

    const holder = await prismaClient.nft_holder.findFirst({ where: { holder: A } })
    expect(holder.lastBlockNumber).to.equal(20)
    expect(await differences()).to.deep.equal([])
  })

  it('never deletes a block replaced between the delete read and its batch', async () => {
    await save(10, 'a', [erc721(C721, ZERO, A, 1)])
    await save(30, 'a', [erc721(C721, ZERO, A, 2)])
    beforeTheNextTransaction(async () => {
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
    let concurrentDelete
    beforeTheNextTransaction(async () => { concurrentDelete = await blocksRepository.deleteOne({ number: 30 }) })

    expect(await blocksRepository.deleteOne({ number: 30 })).to.deep.equal({ count: 0 })
    expect(concurrentDelete).to.deep.equal({ count: 1 })
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

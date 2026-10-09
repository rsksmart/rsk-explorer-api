import { expect } from 'chai'
import { blocksRepository } from '../../../src/repositories'
import { blockData, erc1155Batch, erc1155Single, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C1155 = '0x000000000000000000000000000000000f001155'
const [A, B] = ['1', '2'].map(x => `0x${x.repeat(40)}`)
const holderAt = (prefix, i) => `0x${prefix}${i.toString(16).padStart(39, '0')}`
const ids = n => Array.from({ length: n }, (_, i) => i + 1)

const save = (number, logs) => blocksRepository.saveBlockData(blockData(number, 'a', logs))

integrationDescribe('NFT ownership: blocks whose statements would pass Prisma\'s bind limit', function () {
  this.timeout(600000)

  beforeEach(resetDatabase)

  it('saves and deletes a TransferBatch moving 3,300 ids between two holders, 6,600 balance keys', async () => {
    const moved = ids(3300)
    await save(10, [erc1155Batch(C1155, ZERO, A, moved, moved.map(() => 1))])
    await save(20, [erc1155Batch(C1155, A, B, moved, moved.map(() => 1))])
    expect(await differences()).to.deep.equal([])

    expect(await blocksRepository.deleteOne({ number: 20 })).to.deep.equal({ count: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('saves and deletes a TransferBatch moving 17,000 ids between two holders, whose 34,000 balance keys fill a read to the bind limit exactly', async () => {
    const moved = ids(17000)
    await save(10, [erc1155Batch(C1155, ZERO, A, moved, moved.map(() => 1))])
    await save(20, [erc1155Batch(C1155, A, B, moved, moved.map(() => 1))])
    expect(await differences()).to.deep.equal([])

    expect(await blocksRepository.deleteOne({ number: 20 })).to.deep.equal({ count: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('saves and deletes 5,500 zero-value TransferSingle logs between distinct holders, 11,000 holders in one block', async () => {
    await save(20, ids(5500).map(i => erc1155Single(C1155, holderAt('3', i), holderAt('4', i), 1, 0)))
    expect(await differences()).to.deep.equal([])

    expect(await blocksRepository.deleteOne({ number: 20 })).to.deep.equal({ count: 1 })
    expect(await differences()).to.deep.equal([])
  })

  it('deletes four blocks of 4,100 zero-value TransferSingle logs at once, whose 32,800 holders all need a new last block: the holder list and the four deleted hashes fill a read to the bind limit exactly', async () => {
    const blocks = [20, 21, 22, 23]
    for (const [k, number] of blocks.entries()) await save(number, ids(4100).map(i => erc1155Single(C1155, holderAt('5', k * 4100 + i), holderAt('6', k * 4100 + i), 1, 0)))

    expect(await blocksRepository.deleteMany({ number: { in: blocks } })).to.deep.equal({ count: 4 })
    expect(await differences()).to.deep.equal([])
  })

  it('deletes a block of 16,500 TransferBatch facts, more than an OR of their ids can bind', async () => {
    const minted = ids(16500)
    await save(10, [erc1155Batch(C1155, ZERO, A, minted, minted.map(() => 1))])

    expect(await blocksRepository.deleteOne({ number: 10 })).to.deep.equal({ count: 1 })
    expect(await differences()).to.deep.equal([])
  })
})

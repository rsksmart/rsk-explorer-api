import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { blockData, erc721, erc1155Single, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000c0721'
const C1155 = '0x000000000000000000000000000000000c001155'
const [A, B, D] = ['1', '2', 'd'].map(x => `0x${x.repeat(40)}`)

const runBatch = prismaClient.$transaction
const readers = [[prismaClient.nft_holder, prismaClient.nft_holder.findMany], [prismaClient.nft_balance, prismaClient.nft_balance.findMany]]
const save = (number, logs) => blocksRepository.saveBlockData(blockData(number, 'a', logs))

let codes = []
const recordingBatch = (statements, ...rest) => runBatch.call(prismaClient, statements, ...rest).catch(error => {
  codes.push(error.code)
  throw error
})

function beforeTheFirstBatch (competing) {
  prismaClient.$transaction = async (...args) => {
    prismaClient.$transaction = runBatch
    await competing()
    prismaClient.$transaction = recordingBatch
    return recordingBatch(...args)
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function rightBeforeTheHolderRead (competing) {
  const [[holders, findHolders], [balances, findBalances]] = readers
  let balanceRead = null
  balances.findMany = function (...args) {
    balanceRead = Promise.resolve(findBalances.apply(this, args))
    return balanceRead
  }
  holders.findMany = async function (...args) {
    readers.forEach(([delegate, original]) => { delegate.findMany = original })
    const started = () => balanceRead
    for (let waited = 0; !started() && waited < 100; waited += 5) await sleep(5)
    if (started()) await started()
    await competing()
    return findHolders.apply(this, args)
  }
  prismaClient.$transaction = recordingBatch
}

integrationDescribe('NFT ownership: a save that read holders or balances another writer changed before its batch', function () {
  this.timeout(120000)

  beforeEach(async () => {
    codes = []
    await resetDatabase()
  })
  afterEach(() => {
    prismaClient.$transaction = runBatch
    readers.forEach(([delegate, original]) => { delegate.findMany = original })
  })

  it('a save whose holder another save changed after the read is refused (P2025), reads again, and the tables equal a replay', async () => {
    await save(10, [erc1155Single(C1155, ZERO, A, 7, 5)])
    beforeTheFirstBatch(() => save(20, [erc1155Single(C1155, ZERO, A, 7, 3)]))

    await save(30, [erc1155Single(C1155, A, B, 7, 5)])

    expect(codes).to.deep.equal(['P2025'])
    expect(await differences()).to.deep.equal([])
  })

  it('reads the balances only after the holders\' rows, never before or alongside them, so a save that commits in between cannot leave stale balances under a fresh version', async () => {
    await save(10, [erc1155Single(C1155, ZERO, A, 7, 5)])
    rightBeforeTheHolderRead(() => save(20, [erc1155Single(C1155, ZERO, A, 7, 3)]))

    await save(30, [erc1155Single(C1155, A, B, 7, 5)])

    expect(await differences()).to.deep.equal([])
  })

  it('a save of a holder another save created after the read is refused (P2002), reads again, and the tables equal a replay', async () => {
    beforeTheFirstBatch(() => save(20, [erc721(C721, ZERO, D, 6)]))

    await save(30, [erc721(C721, ZERO, D, 5)])

    expect(codes).to.deep.equal(['P2002'])
    expect(await differences()).to.deep.equal([])
  })
})

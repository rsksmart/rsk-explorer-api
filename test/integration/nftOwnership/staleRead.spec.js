import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { blockData, erc721, erc1155Single, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000c0721'
const C1155 = '0x000000000000000000000000000000000c001155'
const [A, B, D] = ['1', '2', 'd'].map(digit => `0x${digit.repeat(40)}`)

const realTransaction = prismaClient.$transaction
const holderAndBalanceReads = [[prismaClient.nft_holder, prismaClient.nft_holder.findMany], [prismaClient.nft_balance, prismaClient.nft_balance.findMany]]
const save = (number, logs) => blocksRepository.saveBlockData(blockData(number, 'a', logs))

let refusalCodes = []
const recordingTransaction = (statements, ...options) => realTransaction.call(prismaClient, statements, ...options).catch(error => {
  refusalCodes.push(error.code)
  throw error
})

function beforeTheFirstTransaction (competingWrite) {
  prismaClient.$transaction = async (...args) => {
    prismaClient.$transaction = realTransaction
    await competingWrite()
    prismaClient.$transaction = recordingTransaction
    return recordingTransaction(...args)
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function rightBeforeTheHolderRead (competingWrite) {
  const [[holders, findHolders], [balances, findBalances]] = holderAndBalanceReads
  let balanceRead = null
  balances.findMany = function (...args) {
    balanceRead = Promise.resolve(findBalances.apply(this, args))
    return balanceRead
  }
  holders.findMany = async function (...args) {
    holderAndBalanceReads.forEach(([delegate, original]) => { delegate.findMany = original })
    for (let waited = 0; !balanceRead && waited < 100; waited += 5) await sleep(5)
    if (balanceRead) await balanceRead
    await competingWrite()
    return findHolders.apply(this, args)
  }
  prismaClient.$transaction = recordingTransaction
}

function rightBeforeTheNextHolderRead (competingWrite) {
  const [[holders, findHolders]] = holderAndBalanceReads
  holders.findMany = async function (...args) {
    holders.findMany = findHolders
    await competingWrite()
    return findHolders.apply(this, args)
  }
  prismaClient.$transaction = recordingTransaction
}

integrationDescribe('NFT ownership: a save that read holders or balances another writer changed before its batch', function () {
  this.timeout(120000)

  beforeEach(async () => {
    refusalCodes = []
    await resetDatabase()
  })
  afterEach(() => {
    prismaClient.$transaction = realTransaction
    holderAndBalanceReads.forEach(([delegate, original]) => { delegate.findMany = original })
  })

  it('a save whose holder another save changed after the read is refused (P2025), reads again, and the tables equal a replay', async () => {
    await save(10, [erc1155Single(C1155, ZERO, A, 7, 5)])
    beforeTheFirstTransaction(() => save(20, [erc1155Single(C1155, ZERO, A, 7, 3)]))

    await save(30, [erc1155Single(C1155, A, B, 7, 5)])

    expect(refusalCodes).to.deep.equal(['P2025'])
    expect(await differences()).to.deep.equal([])
  })

  it('reads the balances only after the holders\' rows, never before or alongside them, so a save that commits in between cannot leave stale balances under a fresh version', async () => {
    await save(10, [erc1155Single(C1155, ZERO, A, 7, 5)])
    rightBeforeTheHolderRead(() => save(20, [erc1155Single(C1155, ZERO, A, 7, 3)]))

    await save(30, [erc1155Single(C1155, A, B, 7, 5)])

    expect(await differences()).to.deep.equal([])
  })

  it('a save of a holder another save created after the read is refused (P2002), reads again, and the tables equal a replay', async () => {
    beforeTheFirstTransaction(() => save(20, [erc721(C721, ZERO, D, 6)]))

    await save(30, [erc721(C721, ZERO, D, 5)])

    expect(refusalCodes).to.deep.equal(['P2002'])
    expect(await differences()).to.deep.equal([])
  })

  it('a second delete of a block whose holder another delete of the same block removed after the facts were read returns { count: 0 }', async () => {
    await save(5, [erc721(C721, ZERO, A, 1)])
    await save(10, [erc721(C721, A, B, 1)])
    rightBeforeTheNextHolderRead(() => blocksRepository.deleteOne({ number: 10 }))

    const second = await blocksRepository.deleteOne({ number: 10 })

    expect(second).to.deep.equal({ count: 0 })
    expect(refusalCodes).to.deep.equal(['P2025'])
    expect(await differences()).to.deep.equal([])
  })
})

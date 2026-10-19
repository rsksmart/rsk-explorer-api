import { expect } from 'chai'
import sinon from 'sinon'
import ContractParser from '@rsksmart/rsk-contract-parser'
import { prismaClient } from '../../../src/lib/prismaClient'
import { blocksRepository } from '../../../src/repositories'
import { TokenState } from '../../../src/services/classes/TokenState'
import { blockData, erc721, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase } from './replay'

const C721 = '0x00000000000000000000000000000000000c0721'
const A = `0x${'1'.repeat(40)}`
const initConfig = { net: { id: '31', name: 'RSK Testnet' } }
const PROXY_LIST = ['ERC1167', 'ERC165', 'ERC721', 'ERC721Metadata']
const UNSORTED_LIST = ['ERC721', 'ERC165']

const tokenState = () => new TokenState({ initConfig, nod3: {} })
const storedRows = async () => ({
  token: await prismaClient.token.findUnique({
    where: { contract: C721 },
    select: { blockNumber: true, interfaces: true, isNft: true }
  }),
  states: await prismaClient.token_state_at_block.findMany({
    select: { blockNumber: true, interfaces: true, isNft: true },
    orderBy: { blockNumber: 'asc' }
  })
})

function parserAnswers (interfacesAtBlock) {
  sinon.stub(ContractParser.prototype, 'getContractDetails').callsFake(async (contract, blockNumber) => ({
    interfaces: interfacesAtBlock(blockNumber),
    proxyType: null,
    implementationAddress: null
  }))
  sinon.stub(ContractParser.prototype, 'getDefaultTokenData').resolves({
    name: 'Name',
    symbol: 'SYM',
    decimals: 0,
    totalSupply: '1'
  })
}

async function saveWithTheIndexersTokenState (number, logs) {
  const data = blockData(number, 'a', logs)
  await blocksRepository.saveBlockData({ ...data, tokenStates: await tokenState().fetch(data.block, data.events) })
}

integrationDescribe('NFT ownership: the token state writers store the parser\'s interfaces as a list', function () {
  this.timeout(120000)

  beforeEach(resetDatabase)
  afterEach(() => sinon.restore())

  it('the block save stores each block\'s list in the parser\'s order, and the undo copies the earlier list back into token', async () => {
    parserAnswers(number => number === 10 ? PROXY_LIST : UNSORTED_LIST)
    await saveWithTheIndexersTokenState(10, [erc721(C721, ZERO, A, 1)])
    await saveWithTheIndexersTokenState(20, [erc721(C721, ZERO, A, 2)])

    expect((await storedRows()).states.map(state => state.interfaces)).to.deep.equal([PROXY_LIST, UNSORTED_LIST])
    expect(await blocksRepository.deleteOne({ number: 20 })).to.deep.equal({ count: 1 })
    expect((await storedRows()).token).to.deep.include({ blockNumber: 10, interfaces: PROXY_LIST })
  })
})

import { expect } from 'chai'
import sinon from 'sinon'
import ContractParser from '@rsksmart/rsk-contract-parser'
import { TokenState, toTokenState } from '../../../src/services/classes/TokenState'
import { TRANSFER_TOPIC } from '../../../src/lib/nftTransfers'

const initConfig = { net: { id: '30', name: 'RSK Mainnet' } }
const word = hex => `0x${hex.replace(/^0x/, '').padStart(64, '0')}`
const nft = '0x00000000000000000000000000000000000e0721'
const fungible = '0x0000000000000000000000000000000000000020'
const holder = '0x1111111111111111111111111111111111111111'
const event = (address, topics) => ({ eventId: '0597d6700000064cbabababababababab', address, blockNumber: 5928199, blockHash: word('ab'), transactionHash: word('cd'), timestamp: 1, topics, data: word('05') })

const details = { interfaces: ['ERC165', 'ERC721'], proxyType: null, implementationAddress: null }
const tokenData = { name: 'Name', symbol: 'SYM', decimals: 0, totalSupply: { toString: () => '12' } }

describe('TokenState', () => {
  afterEach(() => sinon.restore())

  it('asks the node at the saved block, once per NFT contract of the block, never for a fungible emitter', async () => {
    const getContractDetails = sinon.stub(ContractParser.prototype, 'getContractDetails').resolves(details)
    const getDefaultTokenData = sinon.stub(ContractParser.prototype, 'getDefaultTokenData').resolves(tokenData)
    const events = [
      event(nft, [TRANSFER_TOPIC, word(holder), word(holder), word('01')]),
      event(nft, [TRANSFER_TOPIC, word(holder), word(holder), word('02')]),
      event(fungible, [TRANSFER_TOPIC, word(holder), word(holder)])
    ]

    const states = await new TokenState({ initConfig, nod3: {} }).fetch({ number: 5928199 }, events)

    expect(getContractDetails.args).to.deep.equal([[nft, 5928199]])
    expect(getDefaultTokenData.callCount).to.equal(1)
    expect(getDefaultTokenData.firstCall.args[1]).to.equal(5928199)
    expect(states).to.deep.equal([{ contract: nft, interfaces: 'ERC165,ERC721', isFungible: false, isNft: true, proxyType: null, implementation: null, name: 'Name', symbol: 'SYM', decimals: 0, totalSupply: '12' }])
  })

  it('makes no node call for a block without NFT transfers', async () => {
    const getContractDetails = sinon.stub(ContractParser.prototype, 'getContractDetails').rejects(new Error('should not be called'))

    expect(await new TokenState({ initConfig, nod3: {} }).fetch({ number: 1 }, [event(fungible, [TRANSFER_TOPIC, word(holder), word(holder)])])).to.deep.equal([])
    expect(getContractDetails.called).to.equal(false)
  })

  it('fails the block when the contract details cannot be read, instead of storing a state', async () => {
    sinon.stub(ContractParser.prototype, 'getContractDetails').rejects(new Error('node down'))

    const error = await new TokenState({ initConfig, nod3: {} }).fetch({ number: 1 }, [event(nft, [TRANSFER_TOPIC, word(holder), word(holder), word('01')])]).catch(e => e)
    expect(error.message).to.equal('node down')
  })
})

describe('toTokenState', () => {
  it('fits hostile token data into the columns: control characters stripped, name 128 and symbol 32 characters', () => {
    const state = toTokenState(nft, details, { name: `a\u0000b${'n'.repeat(200)}`, symbol: `\u0007${'s'.repeat(40)}`, decimals: 18, totalSupply: null })

    expect(state.name).to.equal(`ab${'n'.repeat(126)}`)
    expect(state.symbol).to.equal('s'.repeat(32))
    expect(state.totalSupply).to.equal(null)
  })

  it('cuts a long name on a character boundary, as the column counts characters', () => {
    expect(toTokenState(nft, details, { name: '🙂'.repeat(130) }).name).to.equal('🙂'.repeat(128))
  })

  it('stores decimals only within 0-255 and drops a non-string name or symbol', () => {
    expect(toTokenState(nft, details, { decimals: 256 }).decimals).to.equal(null)
    expect(toTokenState(nft, details, { decimals: { toString: () => '-1' } }).decimals).to.equal(null)
    expect(toTokenState(nft, details, { decimals: 255 }).decimals).to.equal(255)
    expect(toTokenState(nft, details, { name: 42, symbol: ['x'] })).to.include({ name: null, symbol: null })
  })

  it('records the proxy type, keeps a valid implementation address lowercased and drops anything else', () => {
    const proxied = toTokenState(nft, { interfaces: ['ERC1967', 'ERC20', 'ERC721'], proxyType: 'ERC1967 Normal Proxy', implementationAddress: '0xABCDEF0000000000000000000000000000000001' }, {})
    expect(proxied).to.include({ proxyType: 'ERC1967 Normal Proxy', implementation: '0xabcdef0000000000000000000000000000000001', isFungible: true, isNft: true })
    expect(toTokenState(nft, { ...details, implementationAddress: '0x1234' }, {}).implementation).to.equal(null)
  })
})

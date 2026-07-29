import { expect } from 'chai'
import sinon from 'sinon'
import Contract from '../../../../src/services/classes/Contract'
import { NULL_BALANCE } from '../../../../src/lib/types'

const contractAddress = '0x11b64191106b1cf66fcd2f8389077c596cdc5646'
const holderA = '0xc0c9d82b59c4d9d77d749f331735e7ed01e2d0e1'
const holderB = '0x4b7da8cc08c1998e6613144b6043c551deb6f445'
const blockNumber = 9000000
const blockHash = '0x72751aa2396a1d034d87d6aecd6d653e985183f4fae380ebaac6c7ea7446ef08'

const initConfig = {
  id: 'explorerInitialConfig',
  nativeContracts: {
    bridge: '0x0000000000000000000000000000000001000006',
    remasc: '0x0000000000000000000000000000000001000008'
  },
  net: { id: '30', name: 'RSK Mainnet' }
}

// One RBTC-scale balance as a 32-byte eth_call return word
const rawBalanceWord = '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000'
const balanceOfAddressSelector = '0x70a08231'

const makeContract = ({ contractInterfaces, batchRequest }) => {
  const nod3 = { batchRequest }
  const contract = new Contract(contractAddress, '0x00', { nod3, initConfig, block: { number: blockNumber } })
  contract.fetched = true
  contract.isToken = true
  contract.setData({ contractInterfaces })
  contract.addTokenAddress(holderA, { blockNumber, blockHash })
  contract.addTokenAddress(holderB, { blockNumber, blockHash })
  return contract
}

describe('Contract entity: fetchTokenAddressesBalances', () => {
  afterEach(() => sinon.restore())

  it('returns no rows for non-token contracts', async () => {
    const batchRequest = sinon.stub().rejects(new Error('should not be called'))
    const contract = makeContract({ contractInterfaces: [], batchRequest })
    contract.isToken = false

    const rows = await contract.fetchTokenAddressesBalances(blockNumber)

    expect(rows).to.deep.equal([])
    expect(batchRequest.called).to.equal(false)
  })

  describe('contracts without an account-level balanceOf (pure ERC-1155)', () => {
    it('sets a null balance on every token address without calling the node', async () => {
      const batchRequest = sinon.stub().rejects(new Error('should not be called'))
      const contract = makeContract({
        contractInterfaces: ['ERC165', 'ERC1155', 'ERC1155MetadataURI'],
        batchRequest
      })

      const rows = await contract.fetchTokenAddressesBalances(blockNumber)

      expect(batchRequest.called).to.equal(false)
      expect(rows).to.have.lengthOf(2)
      for (const row of rows) {
        expect(row.balance).to.equal(NULL_BALANCE)
        expect(row.contract).to.equal(contractAddress)
        expect(row.block).to.deep.equal({ number: blockNumber, hash: blockHash })
      }
      expect(rows.map(r => r.address)).to.deep.equal([holderA, holderB])
    })
  })

  describe('contracts with an account-level balanceOf', () => {
    it('fetches balances via eth.call batches encoding balanceOf(address)', async () => {
      const batchRequest = sinon.stub().resolves([rawBalanceWord, rawBalanceWord])
      const contract = makeContract({ contractInterfaces: ['ERC20'], batchRequest })

      const rows = await contract.fetchTokenAddressesBalances(blockNumber)

      expect(batchRequest.calledOnce).to.equal(true)
      const batch = batchRequest.firstCall.args[0]
      expect(batch).to.have.lengthOf(2)
      for (let i = 0; i < batch.length; i++) {
        const [method, payload, atBlock] = batch[i]
        expect(method).to.equal('eth.call')
        expect(payload.to).to.equal(contractAddress)
        expect(atBlock).to.equal(blockNumber)
        const expectedHolder = [holderA, holderB][i]
        expect(payload.data).to.equal(`${balanceOfAddressSelector}000000000000000000000000${expectedHolder.slice(2)}`)
      }
      expect(rows.map(r => r.balance)).to.deep.equal(['0x0de0b6b3a7640000', '0x0de0b6b3a7640000'])
    })

    it('takes the balance-fetch path when an account-balance interface coexists with ERC1155', async () => {
      const batchRequest = sinon.stub().resolves([rawBalanceWord, rawBalanceWord])
      const contract = makeContract({ contractInterfaces: ['ERC1155', 'ERC20'], batchRequest })

      const rows = await contract.fetchTokenAddressesBalances(blockNumber)

      expect(batchRequest.calledOnce).to.equal(true)
      expect(rows.map(r => r.balance)).to.deep.equal(['0x0de0b6b3a7640000', '0x0de0b6b3a7640000'])
    })
  })

  describe('balanceOf overload safety', () => {
    it('the default ABI carries both balanceOf overloads: the bare name is ambiguous, the explicit signature is not', () => {
      const contract = makeContract({ contractInterfaces: ['ERC20'], batchRequest: sinon.stub() })
      const instance = contract.getContractInstance()

      expect(() => instance.encodeCall('balanceOf', [holderA])).to.throw()
      const encoded = instance.encodeCall('balanceOf(address)', [holderA])
      expect(encoded).to.equal(`${balanceOfAddressSelector}000000000000000000000000${holderA.slice(2)}`)
    })
  })
})

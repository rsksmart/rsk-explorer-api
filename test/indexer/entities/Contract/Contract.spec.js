import { expect } from 'chai'
import Contract from '../../../../src/services/classes/Contract'
import {
  Bridge,
  Remasc,
  DollarOnChain,
  USDRIF,
  USDCe
} from './testContracts'
import { getNod3Instance } from '../../utils/getNod3Instance'
import { compareObjects } from '../../utils/compareObjects'

const testContracts = [
  Bridge, // native contract
  Remasc, // native contract
  DollarOnChain, // normal contract
  USDRIF, // ERC1967 proxy contract
  USDCe // Non standard proxy contract
]

describe('Contract', () => {
  describe('should properly initialize and fetch contract data for all test contracts - unverified abi', () => {
    for (const contractData of testContracts) {
      describe(`${contractData.address} (${contractData.name} - ${contractData.network})`, async () => {
        const {
          address,
          deployedCode,
          dbData,
          initConfig,
          block,
          expectedInitialState,
          expectedStateAfterFetch
        } = contractData

        const nod3 = getNod3Instance(contractData.network)
        const contract = new Contract(address, deployedCode, { dbData, nod3, initConfig, block })

        it('should create a valid Contract instance', () => {
          expect(contract).to.be.an.instanceOf(Contract)
          expect(contract.address).to.equal(address)
          expect(contract.deployedCode).to.equal(deployedCode)
          expect(contract.nod3).to.equal(nod3)
          expect(contract.initConfig).to.deep.equal(initConfig)
          expect(contract.block).to.deep.equal(block)
        })

        // initial state
        const initialState = contract.getData()
        it('should have the correct initial state', () => {
          compareObjects(initialState, expectedInitialState)
        })

        // After fetch state
        it('should have the correct state after fetch', async () => {
          const afterFetchState = await contract.fetch()

          compareObjects(afterFetchState, expectedStateAfterFetch)
        })
      })
    }
  })

  describe('should properly initialize and fetch contract data for all test contracts - verified abi', () => {
    for (const contractData of testContracts) {
      describe(`${contractData.address} (${contractData.name} - ${contractData.network})`, () => {
        const {
          address,
          deployedCode,
          dbData,
          abi: verifiedAbi,
          initConfig,
          block,
          expectedVerifiedInitialState,
          expectedVerifiedStateAfterFetch
        } = contractData

        const nod3 = getNod3Instance(contractData.network)
        const contract = new Contract(address, deployedCode, { dbData, abi: verifiedAbi, nod3, initConfig, block })

        it('should create a valid Contract instance', () => {
          expect(contract).to.be.an.instanceOf(Contract)
          expect(contract.address).to.equal(address)
          expect(contract.deployedCode).to.equal(deployedCode)
          expect(contract.abi).to.deep.equal(verifiedAbi)
          expect(contract.nod3).to.equal(nod3)
          expect(contract.initConfig).to.deep.equal(initConfig)
          expect(contract.block).to.deep.equal(block)
        })

        // initial state
        const initialState = contract.getData()
        it(`should have the correct initial state ${address}`, () => {
          compareObjects(initialState, expectedVerifiedInitialState)
        })

        // After fetch state
        it(`should have the correct state after fetch ${address}`, async () => {
          const afterFetchState = await contract.fetch()

          compareObjects(afterFetchState, expectedVerifiedStateAfterFetch)
        })
      })
    }
  })
})

// todo: add verified cases

import { expect } from 'chai'
import sinon from 'sinon'
import Contract from '../../../../src/services/classes/Contract'
import { verificationResultsRepository } from '../../../../src/repositories'
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
  {
    contractData: Bridge,
    type: 'Native'
  },
  {
    contractData: Remasc,
    type: 'Native'
  },
  {
    contractData: DollarOnChain,
    type: 'Normal/Token'
  },
  {
    contractData: USDCe,
    type: 'Non Standard Proxy/Upgradeable Stablecoin'
  },
  {
    contractData: USDRIF,
    type: 'ERC1967 Proxy/ERC20 token'
  }
]

const verifiedAbisDbResponseMock = {
  [Bridge.address]: { abi: Bridge.abi, match: true },
  [Remasc.address]: { abi: Remasc.abi, match: true },
  [DollarOnChain.address]: { abi: DollarOnChain.abi, match: true },
  [USDRIF.address]: { abi: [], match: true },
  [USDRIF.implementationAddress]: { abi: USDRIF.abi, match: true },
  [USDCe.address]: { abi: [], match: true },
  [USDCe.implementationAddress]: { abi: USDCe.abi, match: true }
}

describe('Contract entity', () => {
  /**
   * @type {import('sinon').SinonStub}
   */
  let findOneStub

  beforeEach(() => {
    // Create the stub before each test
    findOneStub = sinon.stub(verificationResultsRepository, 'findOne')
  })

  afterEach(() => {
    // Restore the original method after each test
    findOneStub.restore()
  })

  describe('should properly initialize and fetch contract data', () => {
    describe('using default contract parser abi', function () {
      for (const { contractData, type } of testContracts) {
        describe(`[${contractData.name} - ${contractData.network}] ${contractData.address} (${type})`, async () => {
          // Configure stub to return null when testing unverified ABIs
          beforeEach(() => {
            findOneStub.resolves(null)
          })

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

            // console.log({
            //   message: 'unverified case fetch done',
            //   expectedStateAfterFetch,
            //   afterFetchState
            // })

            compareObjects(afterFetchState, expectedStateAfterFetch)
          })
        })
      }
    })

    describe('using verified abi', function () {
      for (const { contractData, type } of testContracts) {
        describe(`[${contractData.name} - ${contractData.network}] ${contractData.address} (${type})`, () => {
          // Configure stub to return verified ABIs
          beforeEach(() => {
            // Setup the stub to return the appropriate ABI based on the address
            findOneStub.callsFake(async ({ address }) => {
              return verifiedAbisDbResponseMock[address] || null
            })
          })

          const {
            address,
            deployedCode,
            dbData,
            initConfig,
            block,
            expectedVerifiedInitialState,
            expectedVerifiedStateAfterFetch
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
          it(`should have the correct initial state`, () => {
            compareObjects(initialState, expectedVerifiedInitialState)
          })

          // After fetch state
          it(`should have the correct state after fetch`, async () => {
            const afterFetchState = await contract.fetch()

            // console.log({
            //   message: 'verified case fetch done',
            //   expectedVerifiedStateAfterFetch,
            //   afterFetchState
            // })

            compareObjects(afterFetchState, expectedVerifiedStateAfterFetch)
          })
        })
      }
    })
  })
})

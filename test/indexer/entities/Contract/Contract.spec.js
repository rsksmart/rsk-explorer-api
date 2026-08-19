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

// Keyed by address, holding what findVerifiedAbi answers: an ABI, or null where a
// proxy carries no usable one of its own and the implementation's is the one that counts.
const verifiedAbisDbResponseMock = {
  [Bridge.address]: Bridge.abi,
  [Remasc.address]: Remasc.abi,
  [DollarOnChain.address]: DollarOnChain.abi,
  [USDRIF.address]: null,
  [USDRIF.implementationAddress]: USDRIF.abi,
  [USDCe.address]: null,
  [USDCe.implementationAddress]: USDCe.abi
}

const ERC1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

/**
 * A proxy's implementation is upgraded on chain, so pinning the address a
 * fixture was recorded against makes the ABI lookup miss the day it changes and
 * the contract silently falls back to a default ABI. The address is read from
 * the proxy instead, and the fixture's ABI is answered for whatever it reports.
 */
const answerForCurrentImplementation = async (proxy) => {
  const nod3 = getNod3Instance(proxy.network)
  const slot = await nod3.eth.getStorageAt(
    proxy.address,
    ERC1967_IMPLEMENTATION_SLOT
  )
  const implementation = `0x${slot.slice(26)}`.toLowerCase()

  if (implementation !== proxy.implementationAddress) {
    verifiedAbisDbResponseMock[implementation] = proxy.abi
  }
}

describe('Contract entity', () => {
  /**
   * @type {import('sinon').SinonStub}
   */
  let findVerifiedAbiStub

  before(async () => {
    for (const proxy of [USDRIF, USDCe]) {
      await answerForCurrentImplementation(proxy)
    }
  })

  beforeEach(() => {
    // Create the stub before each test
    findVerifiedAbiStub = sinon.stub(verificationResultsRepository, 'findVerifiedAbi')
  })

  afterEach(() => {
    // Restore the original method after each test
    findVerifiedAbiStub.restore()
  })

  describe('should properly initialize and fetch contract data', () => {
    describe('using default contract parser abi', function () {
      for (const { contractData, type } of testContracts) {
        describe(`[${contractData.name} - ${contractData.network}] ${contractData.address} (${type})`, async () => {
          // Configure stub to return null when testing unverified ABIs
          beforeEach(() => {
            findVerifiedAbiStub.resolves(null)
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
            findVerifiedAbiStub.callsFake(async (address) => {
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

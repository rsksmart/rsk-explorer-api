import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/contractVerification'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getVerifiedContracts,
  // verify, TODO
  getSolcVersions,
  getEvmVersions,
  getVerificationResult,
  isVerified
} = endpoints

const {
  idsForGetVerificationResultEndpoint,
  addressesForGetIsVerifiedEndpoint
} = fixtures[network]

describe('ContractVerification module', () => {
  describe('GET getVerifiedContracts endpoint', () => {
    const endpoint = getVerifiedContracts()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })

  describe('GET getSolcVersions endpoint', () => {
    const endpoint = getSolcVersions()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })

  describe('GET getEvmVersions endpoint', () => {
    const endpoint = getEvmVersions()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })

  describe('GET getVerificationResult endpoint', () => {
    for (const id of idsForGetVerificationResultEndpoint) {
      const endpoint = getVerificationResult({ id })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET getVerification endpoint', () => {
    for (const address of addressesForGetIsVerifiedEndpoint) {
      const endpoint = isVerified({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })
})

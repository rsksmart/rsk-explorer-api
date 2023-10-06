import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/contractVerification'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getVerifiedContracts,
  // verify,
  getSolcVersions,
  getEvmVersions,
  // getVerificationResult,
  isVerified
} = endpoints

const {
  addressesForIsVerifiedEndpoint
} = fixtures[network]

const keysToSkipForContractVerification = {
  data: ['_id', ['request', '_id'], 'timestamp']
}

describe('ContractVerification module', () => {
  describe('GET getVerifiedContracts endpoint', () => {
    const endpoint = getVerifiedContracts()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({
        endpoint,
        keysToSkip: keysToSkipForContractVerification
      })
    })
  })

  // TODO: Check verify endpoint behaviour, then perform this test
  // describe('GET verify endpoint', () => {
  //   const endpoint = verify()
  //   it(sameDataMsg(endpoint), async () => {
  //     await compareDataFromBothEnvs({ endpoint })
  //   })
  // })

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

  // TODO: Check how to perform this test
  // Requests are not unique, also ids for the same address will differ (diff timestamp)
  // describe('GET getVerificationResult endpoint', () => {
  //   for (const id of idsForGetVerificationResultEndpoint) {
  //     const endpoint = getVerificationResult({ id })
  //     it(sameDataMsg(endpoint), async () => {
  //       await compareDataFromBothEnvs({ endpoint })
  //     })
  //   }
  // })

  describe('GET isVerified endpoint', () => {
    for (const address of addressesForIsVerifiedEndpoint) {
      const endpoint = isVerified({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForContractVerification
        })
      })
    }
  })
})

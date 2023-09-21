import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/verificationResults'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getResults,
  getVerification
} = endpoints

const {
  addressesForGetIsVerifiedEndpoint
} = fixtures[network]

describe('VerificationResults module', () => {
  describe('GET getResults endpoint', () => {
    const endpoint = getResults()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })

  describe('GET getVerification endpoint', () => {
    for (const address of addressesForGetIsVerifiedEndpoint) {
      const endpoint = getVerification({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })
})

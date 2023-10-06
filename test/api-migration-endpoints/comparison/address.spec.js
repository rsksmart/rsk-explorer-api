import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/address'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getAddress,
  getAddresses,
  getMiners,
  getTokens,
  getCirculatingSupply,
  getCode,
  findAddresses
} = endpoints

const {
  addressesForGetAddressEndpoint,
  blockNumbersForGetMinersEndpoint,
  addressesForGetCodeEndpoint,
  namesForFindAddressesEndpoint
} = fixtures[network]

const keysToSkipForAddress = {
  data: ['_id', ['lastBlockMined', '_received']]
}

describe('Address module', () => {
  describe('GET getAddress endpoint', () => {
    for (const address of addressesForGetAddressEndpoint) {
      const endpoint = getAddress({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForAddress
        })
      })
    }
  })

  describe('GET getAddresses endpoint', () => {
    const endpoint = getAddresses()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({
        endpoint,
        keysToSkip: keysToSkipForAddress
      })
    })
  })

  describe('GET getMiners endpoint', () => {
    for (const fromBlock of blockNumbersForGetMinersEndpoint) {
      const endpoint = getMiners({ fromBlock })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForAddress
        })
      })
    }
  })

  describe('GET getTokens endpoint', () => {
    const endpoint = getTokens()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({
        endpoint,
        keysToSkip: keysToSkipForAddress
      })
    })
  })

  describe('GET getCirculatingSupply endpoint', () => {
    const endpoint = getCirculatingSupply()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({
        endpoint,
        keysToSkip: keysToSkipForAddress
      })
    })
  })

  describe('GET getCode endpoint', () => {
    for (const address of addressesForGetCodeEndpoint) {
      const endpoint = getCode({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForAddress
        })
      })
    }
  })

  describe('GET findAddresses endpoint', () => {
    for (const name of namesForFindAddressesEndpoint) {
      const endpoint = findAddresses({ name })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForAddress
        })
      })
    }
  })
})

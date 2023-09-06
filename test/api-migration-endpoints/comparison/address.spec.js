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

describe('Address module', () => {
  describe('GET getAddress endpoint', () => {
    for (const address of addressesForGetAddressEndpoint) {
      const endpoint = getAddress({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET getAddresses endpoint', () => {
    const endpoint = getAddresses()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })

  describe('GET getMiners endpoint', () => {
    const endpoint = getMiners()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })

  describe('GET getTokens endpoint', () => {
    const endpoint = getTokens()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })

    for (const fromBlock of blockNumbersForGetMinersEndpoint) {
      const endpoint = getMiners({ fromBlock })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET getCirculatingSupply endpoint', () => {
    const endpoint = getCirculatingSupply()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })

  describe('GET getCode endpoint', () => {
    for (const address of addressesForGetCodeEndpoint) {
      const endpoint = getCode({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET findAddresses endpoint', () => {
    for (const name of namesForFindAddressesEndpoint) {
      const endpoint = findAddresses({ name })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })
})

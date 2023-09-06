import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/balance'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getBalance,
  getBalances,
  getStatus
} = endpoints

const {
  blockNumbersAndAddressesForGetBalanceEndpoint,
  addressesForGetBalancesEndpoint
} = fixtures[network]

describe('Balance module', () => {
  describe('GET getBalance endpoint', () => {
    for (const { address, block } of blockNumbersAndAddressesForGetBalanceEndpoint) {
      const endpoint = getBalance({ address, block })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET getBalances endpoint', () => {
    for (const address of addressesForGetBalancesEndpoint) {
      const endpoint = getBalances({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET getStatus endpoint', () => {
    const endpoint = getStatus()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })
})

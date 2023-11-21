import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/token'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getTokenAccounts,
  getTokensByAddress,
  getContractAccount,
  getTokenAccount,
  getTokenBalance
} = endpoints

const {
  contractAddressesForGetTokenAccountsEndpoint,
  addressesForGetTokensByAddressEndpoint,
  contractsAndAddressesForGetContractAccountEndpoint,
  contractsAndAddressesForGetTokenAccountEndpoint,
  contractAddressesForGetTokenBalanceEndpoint
} = fixtures[network]

const keysToSkipForToken = {
  data: ['_id']
}

function removePostgresTokenBalancesNotSavedInMongo (postgresList, mongoList) {
  return {
    processedMongo: mongoList,
    processedPostgres: postgresList.filter(({ address: pAddress, contract: pContract, block: { number: pNumber } }) => {
      return mongoList.some(({ address: mAddress, contract: mContract, block: { number: mNumber } }) => {
        return pAddress === mAddress && pContract === mContract && pNumber === mNumber
      })
    })
  }
}

describe('Token module', () => {
  describe('GET getTokenAccounts endpoint', () => {
    const availableParams = ['contract', 'address']
    for (const address of contractAddressesForGetTokenAccountsEndpoint) {
      const endpoint = getTokenAccounts({ [availableParams[Math.floor(Math.random() * 2)]]: address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForToken,
          processData: removePostgresTokenBalancesNotSavedInMongo
        })
      })
    }
  })

  describe('GET getTokensByAddress endpoint', () => {
    for (const address of addressesForGetTokensByAddressEndpoint) {
      const endpoint = getTokensByAddress({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForToken,
          processData: removePostgresTokenBalancesNotSavedInMongo
        })
      })
    }
  })

  describe('GET getContractAccount endpoint', () => {
    for (const { address, contract } of contractsAndAddressesForGetContractAccountEndpoint) {
      const endpoint = getContractAccount({ address, contract })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForToken
        })
      })
    }
  })

  describe('GET getTokenAccount endpoint', () => {
    for (const { address, contract } of contractsAndAddressesForGetTokenAccountEndpoint) {
      const endpoint = getTokenAccount({ address, contract })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForToken
        })
      })
    }
  })

  describe('GET getTokenBalance endpoint', () => {
    for (const contract of contractAddressesForGetTokenBalanceEndpoint) {
      const endpoint = getTokenBalance({ contract })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForToken
        })
      })
    }
  })
})

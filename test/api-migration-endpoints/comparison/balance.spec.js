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

const keysToSkipForBalance = {
  data: ['_created', '_id']
}

function removePostgresBalancesNotSavedInMongo (postgresList, mongoList) {
  return {
    processedMongo: mongoList,
    processedPostgres: postgresList.filter(({ address: pAddress, blockNumber: pBlock }) => {
      return mongoList.some(({ address: mAddress, blockNumber: mBlock }) => pAddress === mAddress && pBlock === mBlock)
    })
  }
}

function equalBlock0to1InGetStatusEndpoint (postgresStatus, mongoStatus) {
  if ((postgresStatus && postgresStatus.fromBlock.blockNumber === 0) && (mongoStatus && mongoStatus.fromBlock.blockNumber === 1)) {
    delete mongoStatus.fromBlock
  }

  return {
    processedPostgres: postgresStatus,
    processedMongo: { fromBlock: postgresStatus.fromBlock, ...mongoStatus }
  }
}

describe('Balance module', () => {
  describe('GET getBalance endpoint', () => {
    for (const { address, block } of blockNumbersAndAddressesForGetBalanceEndpoint) {
      const endpoint = getBalance({ address, block })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForBalance
        })
      })
    }
  })

  describe('GET getBalances endpoint', () => {
    for (const address of addressesForGetBalancesEndpoint) {
      const endpoint = getBalances({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForBalance,
          processData: removePostgresBalancesNotSavedInMongo
        })
      })
    }
  })

  describe('GET getStatus endpoint', () => {
    const endpoint = getStatus()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({
        endpoint,
        keysToSkip: keysToSkipForBalance,
        processData: equalBlock0to1InGetStatusEndpoint
      })
    })
  })
})

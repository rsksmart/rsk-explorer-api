import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/internalTx'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getInternalTransaction,
  getInternalTransactions,
  getInternalTransactionsByAddress,
  getInternalTransactionsByBlock,
  getInternalTransactionsByTxHash
} = endpoints

const {
  internalTxIdsForGetInternalTransactionEndpoint,
  addressesForGetInternalTransactionsByAddressEndpoint,
  blockHashesForGetInternalTransactionsByBlockEndpoint,
  blockNumbersForGetInternalTransactionsByBlockEndpoint,
  txHashesForGetInternalTransactionsByTxHashEndpoint
} = fixtures[network]

const keysToSkipForInternalTx = {
  data: ['_id']
}

describe('InternalTx module', () => {
  describe('GET getInternalTransaction endpoint', () => {
    for (const internalTxId of internalTxIdsForGetInternalTransactionEndpoint) {
      const endpoint = getInternalTransaction({ internalTxId })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForInternalTx
        })
      })
    }
  })

  describe('GET getInternalTransactions endpoint', () => {
    const endpoint = getInternalTransactions()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({
        endpoint: endpoint + '&limit=200',
        keysToSkip: keysToSkipForInternalTx
      })
    })
  })

  describe('GET getInternalTransactionsByAddress endpoint', () => {
    for (const address of addressesForGetInternalTransactionsByAddressEndpoint) {
      const endpoint = getInternalTransactionsByAddress({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForInternalTx
        })
      })
    }
  })

  describe('GET getInternalTransactionsByBlock endpoint', () => {
    for (const hash of blockHashesForGetInternalTransactionsByBlockEndpoint) {
      const endpoint = getInternalTransactionsByBlock({ hashOrNumber: hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForInternalTx
        })
      })
    }

    const availableParams = ['hashOrNumber', 'number']
    for (const number of blockNumbersForGetInternalTransactionsByBlockEndpoint) {
      const endpoint = getInternalTransactionsByBlock({ [availableParams[Math.floor(Math.random() * 2)]]: number })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForInternalTx
        })
      })
    }
  })

  describe('GET getInternalTransactionsByTxHash endpoint', () => {
    const availableParams = ['transactionHash', 'hash']
    for (const hash of txHashesForGetInternalTransactionsByTxHashEndpoint) {
      const endpoint = getInternalTransactionsByTxHash({ [availableParams[Math.floor(Math.random() * 2)]]: hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForInternalTx
        })
      })
    }
  })
})

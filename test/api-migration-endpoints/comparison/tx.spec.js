import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/tx'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getTransactions,
  getTransaction,
  getTransactionWithAddressData,
  getTransactionsByBlock,
  getTransactionsByAddress
} = endpoints

const {
  queriesForGetTransactionsEndpoint,
  transactionHashesForGetTransactionEndpoint,
  transactionHashesForGetTransactionWithAddressDataEndpoint,
  blockHashesForGetTransactionsByBlockEndpoint,
  blockNumbersForGetTransactionsByBlockEndpoint,
  addressesForGetTransactionsByAddressEndpoint
} = fixtures[network]

const keysToSkipForTx = {
  data: ['_id']
}

describe('Tx module', () => {
  describe('GET getTransactions endpoint', () => {
    for (const query of queriesForGetTransactionsEndpoint) {
      const endpoint = getTransactions({ query })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForTx
        })
      })
    }

    it(sameDataMsg(getTransactions()), async () => {
      await compareDataFromBothEnvs({
        endpoint: getTransactions(),
        keysToSkip: keysToSkipForTx
      })
    })
  })

  describe('GET getTransaction endpoint', () => {
    for (const hash of transactionHashesForGetTransactionEndpoint) {
      const endpoint = getTransaction({ hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForTx
        })
      })
    }
  })

  describe('GET getTransactionWithAddressData endpoint', () => {
    for (const hash of transactionHashesForGetTransactionWithAddressDataEndpoint) {
      const endpoint = getTransactionWithAddressData({ hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForTx
        })
      })
    }
  })

  describe('GET getTransactionsByBlock endpoint', () => {
    const availableParams = ['hashOrNumber', 'number']
    for (const number of blockNumbersForGetTransactionsByBlockEndpoint) {
      const endpoint = getTransactionsByBlock({ [availableParams[Math.floor(Math.random() * 2)]]: number })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForTx
        })
      })
    }

    for (const hash of blockHashesForGetTransactionsByBlockEndpoint) {
      const endpoint = getTransactionsByBlock({ hashOrNumber: hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForTx
        })
      })
    }
  })

  describe('GET getTransactionsByAddress endpoint', () => {
    for (const address of addressesForGetTransactionsByAddressEndpoint) {
      const endpoint = getTransactionsByAddress({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForTx
        })
      })
    }
  })
})

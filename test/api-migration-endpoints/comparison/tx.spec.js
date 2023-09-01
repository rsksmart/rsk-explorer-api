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

describe('Tx module', () => {
  describe('GET getTransactions endpoint', () => {
    for (const query of queriesForGetTransactionsEndpoint) {
      const endpoint = getTransactions({ query })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }

    it(sameDataMsg(getTransactions()), async () => {
      await compareDataFromBothEnvs(getTransactions())
    })
  })

  describe.only('GET getTransaction endpoint', () => {
    for (const hash of transactionHashesForGetTransactionEndpoint) {
      const endpoint = getTransaction({ hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe.only('GET getTransactionWithAddressData endpoint', () => {
    for (const hash of transactionHashesForGetTransactionWithAddressDataEndpoint) {
      const endpoint = getTransactionWithAddressData({ hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET getTransactionsByBlock endpoint', () => {
    const availableParams = ['hashOrNumber', 'number']
    for (const number of blockNumbersForGetTransactionsByBlockEndpoint) {
      const endpoint = getTransactionsByBlock({ [availableParams[Math.floor(Math.random() * 2)]]: number })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }

    for (const hash of blockHashesForGetTransactionsByBlockEndpoint) {
      const endpoint = getTransactionsByBlock({ hashOrNumber: hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET getTransactionsByAddress endpoint', () => {
    for (const address of addressesForGetTransactionsByAddressEndpoint) {
      const endpoint = getTransactionsByAddress({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })
})

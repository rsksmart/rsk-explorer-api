import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/txPending'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getPendingTransaction,
  getPendingTransactionsByAddress
} = endpoints

const {
  txHashesForGetPendingTransactionEndpoint,
  addressesForGetPendingTransactionsByAddress
} = fixtures[network]

describe('TxPending module', () => {
  describe('GET getPendingTransaction endpoint', () => {
    for (const hash of txHashesForGetPendingTransactionEndpoint) {
      const endpoint = getPendingTransaction({ hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET getPendingTransactionsByAddress endpoint', () => {
    for (const address of addressesForGetPendingTransactionsByAddress) {
      const endpoint = getPendingTransactionsByAddress({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })
})

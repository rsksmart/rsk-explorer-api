import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/summary'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getSummary,
  getSummaries
} = endpoints

const {
  blockHashesForGetSummaryEndpoint
} = fixtures[network]

const keysToSkipForBlockSummary = {
  data: [
    '_id',
    ['data', 'block', '_received'],
    ['data', 'addresses', ['lastBlockMined', '_received']]
  ],
  atRoot: [
    ['prev', '_id'],
    ['prev', 'id'],
    ['next', '_id'],
    ['next', 'id']
  ]
}

function orderSummaryAddressesAndDeleteReceivedAttributeFromTheirLastBlockMined (postgresObject, mongoObject) {
  function orderAddressesAndDeleteReceivedAttributeFromTheirLastBlockMined (summary) {
    summary.data.addresses.sort((a1, a2) => {
      if (a1.lastBlockMined) delete a1.lastBlockMined._received
      if (a2.lastBlockMined) delete a2.lastBlockMined._received
      return a1.address - a2.address
    })
  }

  if (Array.isArray(postgresObject) && Array.isArray(mongoObject)) {
    for (const summary of postgresObject) {
      orderAddressesAndDeleteReceivedAttributeFromTheirLastBlockMined(summary)
    }

    for (const summary of mongoObject) {
      orderAddressesAndDeleteReceivedAttributeFromTheirLastBlockMined(summary)
    }
  } else {
    orderAddressesAndDeleteReceivedAttributeFromTheirLastBlockMined(postgresObject)
    orderAddressesAndDeleteReceivedAttributeFromTheirLastBlockMined(mongoObject)
  }

  return {
    processedPostgres: postgresObject,
    processedMongo: mongoObject
  }
}

describe('Summary module', () => {
  describe('GET getSummary endpoint', () => {
    for (const hash of blockHashesForGetSummaryEndpoint) {
      const endpoint = getSummary({ hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForBlockSummary,
          processData: orderSummaryAddressesAndDeleteReceivedAttributeFromTheirLastBlockMined
        })
      })
    }
  })

  describe('GET getSummaries endpoint', () => {
    const endpoint = getSummaries()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({
        endpoint,
        keysToSkip: keysToSkipForBlockSummary,
        processData: orderSummaryAddressesAndDeleteReceivedAttributeFromTheirLastBlockMined
      })
    })
  })
})

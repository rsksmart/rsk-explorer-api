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

describe('Summary module', () => {
  describe.only('GET getSummary endpoint', () => {
    for (const hash of blockHashesForGetSummaryEndpoint) {
      const endpoint = getSummary({ hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({ endpoint })
      })
    }
  })

  describe('GET getSummaries endpoint', () => {
    const endpoint = getSummaries()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })
})

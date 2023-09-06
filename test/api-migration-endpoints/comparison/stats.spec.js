import { endpoints } from '../config/modules/stats'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const {
  getStats,
  getLatest
} = endpoints

describe('Stats module', () => {
  describe('GET getStats endpoint', () => {
    const endpoint = getStats()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })

  describe('GET getLatest endpoint', () => {
    const endpoint = getLatest()
    it(sameDataMsg(endpoint), async () => {
      await compareDataFromBothEnvs({ endpoint })
    })
  })
})

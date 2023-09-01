import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/block'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getBlock,
  getBlocks
} = endpoints

const {
  blockHashesforGetBlockEndpoint,
  blockNumbersForGetBlockEndpoint,
  minersForGetBlocksEndpoint
} = fixtures[network]

describe('Block module', () => {
  describe.only('GET getBlock endpoint', () => {
    let availableParams = ['hash', 'hashOrNumber']
    for (const hash of blockHashesforGetBlockEndpoint) {
      const endpoint = getBlock({ [availableParams[Math.floor(Math.random() * 2)]]: hash })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs(endpoint)
      })
    }

    availableParams = ['number', 'hashOrNumber']
    for (const number of blockNumbersForGetBlockEndpoint) {
      const endpoint = getBlock({ [availableParams[Math.floor(Math.random() * 2)]]: number })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs(endpoint)
      })
    }
  })

  describe('GET getBlocks endpoint', () => {
    it(sameDataMsg(getBlocks()), async () => {
      await compareDataFromBothEnvs(getBlocks())
    })

    for (const miner of minersForGetBlocksEndpoint) {
      const endpoint = getBlocks({ miner })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs(endpoint)
      })
    }

    it(sameDataMsg(getBlocks({ addMetadata: true })), async () => {
      await compareDataFromBothEnvs(getBlocks({ addMetadata: true }))
    })
  })
})

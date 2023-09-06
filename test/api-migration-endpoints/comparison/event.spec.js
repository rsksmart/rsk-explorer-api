import config from '../config/settings'
import { endpoints, fixtures } from '../config/modules/event'
import { compareDataFromBothEnvs } from '../utils/compareData'
import { sameDataMsg } from '../utils/testMsg'

const { network } = config

const {
  getEvent,
  getEventsByAddress,
  getAllEventsByAddress
} = endpoints

const {
  eventIdsForGetEventEndpoint,
  addressesForGetEventsByAddressEndpoint,
  addressesForGetAllEventsByAddressEndpoint
} = fixtures[network]

const keysToSkipForEvent = {
  data: ['_id']
}

describe('Event module', () => {
  describe('GET getEvent endpoint', () => {
    for (const eventId of eventIdsForGetEventEndpoint) {
      const endpoint = getEvent({ eventId })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForEvent
        })
      })
    }
  })

  describe('GET getEventsByAddress endpoint', () => {
    for (const address of addressesForGetEventsByAddressEndpoint) {
      const endpoint = getEventsByAddress({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForEvent
        })
      })
    }
  })

  describe('GET getAllEventsByAddress endpoint', () => {
    for (const address of addressesForGetAllEventsByAddressEndpoint) {
      const endpoint = getAllEventsByAddress({ address })
      it(sameDataMsg(endpoint), async () => {
        await compareDataFromBothEnvs({
          endpoint,
          keysToSkip: keysToSkipForEvent
        })
      })
    }
  })
})

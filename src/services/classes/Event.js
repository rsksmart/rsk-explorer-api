import { eventId } from '../../lib/txFormat'

export const formatEvent = (event, tx) => {
  let { timestamp, receipt } = tx
  let id = eventId(event, tx)
  event._id = id
  event.eventId = id
  event.timestamp = timestamp
  event.txStatus = receipt.status
  event.event = event.event || null
  return event
}

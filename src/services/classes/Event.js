import { getEventId } from '../../lib/ids'

export const formatEvent = (event, tx) => {
  let { timestamp, receipt } = tx
  let id = getEventId(event, tx)
  event.eventId = id
  event.timestamp = timestamp
  event.txStatus = receipt.status
  event.event = event.event || null
  return event
}

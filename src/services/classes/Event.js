import { getEventId } from '../../lib/ids'

export const formatEvent = (event, tx) => {
  if (!event) return
  const { timestamp, receipt } = tx
  const id = getEventId(event)
  event.eventId = id
  event.timestamp = timestamp
  event.txStatus = receipt.status
  event.event = event.event || null
  event._addresses = event._addresses || []
  return event
}

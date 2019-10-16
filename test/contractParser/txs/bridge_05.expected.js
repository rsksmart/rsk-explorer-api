
import { result as tx } from './bridge_05.json'

export default {
  tx,
  expect: {
    events: [
      {
        event: 'update_collections_topic',
        args: {
          sender: '0x0345174501d5f6fc7926377b63317c4ad7215905'
        }
      }
    ]
  }
}

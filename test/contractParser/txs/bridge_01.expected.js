import { result as tx } from './bridge_01.json'

export default {
  tx,
  expect: {
    events: [
      {
        event: 'update_collections_topic',
        args: {
          sender: '0x4495768e683423a4299d6a7f02a0689a6ff5a0a4'
        }
      }
    ]
  }
}


import { result as tx } from './bridge_02.json'

export default {
  tx,
  expect: {
    events: [
      {
        event: 'add_signature_topic',
        args: {
          0: '0xd9066c0eb9b2805734ca3f58e6ebe8a565b543ba4aea84b434ebbd32cbe8bf62',
          1: '0xfb8fde48fbb5af01c98b08c006a7545826fc8c34',
          2: '0x43eed54b6534dd96715508e8f4709c1d0a5f1c301a028670c86575a9415af8a5'
        }

      }
    ]
  }
}

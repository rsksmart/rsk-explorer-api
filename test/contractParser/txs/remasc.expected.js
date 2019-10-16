import { result as tx } from './remasc.json'

export default {
  tx,
  expect: {
    events: [
      {
        event: 'mining_fee_topic',
        args: {
          to: '0x14d3065c8eb89895f4df12450ec6b130049f8034',
          blockHash: '0xafa6eb34c02132ece5f3fc35429207ea5723c2e6a567c0e15150b05093425c4c',
          value: '0x06d4750d906b'
        }
      },
      {
        event: 'mining_fee_topic',
        args: {
          to: '0x12d3178a62ef1f520944534ed04504609f7307a1',
          blockHash: '0xafa6eb34c02132ece5f3fc35429207ea5723c2e6a567c0e15150b05093425c4c',
          value: '0x02b46399d9f5'
        }
      },
      {
        event: 'mining_fee_topic',
        args: {
          to: '0x8e8056f7913685d0d95a6c4c6db0455255930855',
          blockHash: '0xafa6eb34c02132ece5f3fc35429207ea5723c2e6a567c0e15150b05093425c4c',
          value: '0x0b8ff6981d61'
        }
      },
      {
        event: 'mining_fee_topic',
        args: {
          to: '0x32dfc7a84f24b10a5dded1d8b24f48b96ab77373',
          blockHash: '0xafa6eb34c02132ece5f3fc35429207ea5723c2e6a567c0e15150b05093425c4c',
          value: '0x0c2bc03454d1'
        }
      }
    ]
  }
}

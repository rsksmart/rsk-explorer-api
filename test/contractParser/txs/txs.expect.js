import tx1 from './01.json'
import tx2 from './02.json'
import tx3 from './03.json'

export default [
  {
    tx: tx1.result,
    expect: {
      events: [
        {
          event: 'OwnershipTransferred',
          args: {
            from: '0x0000000000000000000000000000000000000000',
            to: '0x9128785b060d47ab417d6cee72e25358c6bd677f'
          }
        }
      ]
    }
  },
  {
    tx: tx2.result,
    expect: {
      events: [
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0xb92675ccf00728fee1390a5d0d4ca594ecfb5c1f',
            value: '0xfd5b62ad0505ecaed7000'
          }
        },
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0xd5ae806315937698db2b9c13bbfc149e59dcda80',
            value: '0x21c7eb0600ab814f06c00'
          }
        },
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0xe4e962e97998a976a337752c978eff857379850c',
            value: '0x10e3f5830055d347e2800'
          }
        },
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0x2d9bea5f54e315dc40a14d4a2196687a15c6f9b2',
            value: '0x19d51d22b537ece26dc00'
          }
        },
        {
          event: 'Transfer',
          args: {
            from: '0xda1683aa3a4d16f76bcd3ef2c209ba332e533f4d',
            to: '0x517cd1c1ff08ab6a1c7ec742a8c51cc0f09954e5',
            value: '0x511300db34ceedbe4200'
          }
        }
      ]
    }
  },
  {
    tx: tx3.result,
    expect: {
      events: [
        {
          event: 'mining_fee_topic',
          args: {
            to: '0x14d3065c8eb89895f4df12450ec6b130049f8034',
            blockHash: '0xafa6eb34c02132ece5f3fc35429207ea5723c2e6a567c0e15150b05093425c4c',
            value: '0x6d4750d906b'
          }
        },
        {
          event: 'mining_fee_topic',
          args: {
            to: '0x12d3178a62ef1f520944534ed04504609f7307a1',
            blockHash: '0xafa6eb34c02132ece5f3fc35429207ea5723c2e6a567c0e15150b05093425c4c',
            value: '0x2b46399d9f5'
          }
        },
        {
          event: 'mining_fee_topic',
          args: {
            to: '0x8e8056f7913685d0d95a6c4c6db0455255930855',
            blockHash: '0xafa6eb34c02132ece5f3fc35429207ea5723c2e6a567c0e15150b05093425c4c',
            value: '0xb8ff6981d61'
          }
        },
        {
          event: 'mining_fee_topic',
          args: {
            to: '0x32dfc7a84f24b10a5dded1d8b24f48b96ab77373',
            blockHash: '0xafa6eb34c02132ece5f3fc35429207ea5723c2e6a567c0e15150b05093425c4c',
            value: '0xc2bc03454d1'
          }
        }
      ]
    }
  }
]

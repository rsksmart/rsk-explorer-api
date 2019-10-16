import { result as tx } from './02.json'

export default {
  tx,
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
}

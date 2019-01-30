import { add0x, remove0x } from '../../src/lib/utils'
import { expect } from 'chai'

const addSpec = [
  ['123456', '0x123456'],
  ['abc456', '0xabc456'],
  ['john', 'john'],
  ['0x23897bcfe8', '0x23897bcfe8']
]

const removeSpec = [
  ['123456', '123456'],
  ['0xabc456', 'abc456'],
  ['john', 'john'],
  ['0x23897bcfe8', '23897bcfe8'],
  ['0x1234a0xb', '0x1234a0xb']
]

describe('# add0x', function () {
  for (let spec of addSpec) {
    it(`${spec[0]} should return ${spec[1]}`, function () {
      expect(add0x(spec[0])).to.be.equal(spec[1])
    })
  }
})

describe('# remove0x', function () {
  for (let spec of removeSpec) {
    it(`${spec[0]} should return ${spec[1]}`, function () {
      expect(remove0x(spec[0])).to.be.equal(spec[1])
    })
  }
})
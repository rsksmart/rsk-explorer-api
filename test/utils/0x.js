import { add0x, remove0x, isValidBlockNumber } from '../../src/lib/utils'
import { expect } from 'chai'

const addSpec = [
  ['123456', '0x123456'],
  ['abc456', '0xabc456'],
  ['john', 'john'],
  ['0x23897bcfe8', '0x23897bcfe8'],
  ['-1b5267b1b18ce000000', '-0x1b5267b1b18ce000000']
]

const removeSpec = [
  ['123456', '123456'],
  ['0xabc456', 'abc456'],
  ['-0xabc456', '-abc456'],
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

describe(`# isValidBlockNumber`, function () {
  it(`undefined should be false`, () => {
    expect(isValidBlockNumber()).to.be.equal(false)
  })
  it(`null should be false`, () => {
    expect(isValidBlockNumber(null)).to.be.equal(false)
  })
  it(`negative numbers should be false`, () => {
    expect(isValidBlockNumber(-1)).to.be.equal(false)
    expect(isValidBlockNumber(-1000)).to.be.equal(false)
  })
  it(`0 should be true`, () => {
    expect(isValidBlockNumber(0)).to.be.equal(true)
  })
  it(`integers should be true`, () => {
    expect(isValidBlockNumber(1)).to.be.equal(true)
    expect(isValidBlockNumber(0x2)).to.be.equal(true)
    expect(isValidBlockNumber(900000)).to.be.equal(true)
  })
})

import { expect } from 'chai'
import { toAscii } from '../../src/lib/utils'

describe(`toAscii()`, function () {
  let cases = [
    ['657468657265756d000000000000000000000000000000000000000000000000', 'ethereum'],
    ['0x657468657265756d', 'ethereum'],
    ['0x657468657265756d', 'ethereum'],
    ['0x657468657265756d000000000000000000000000000000000000000000000000', 'ethereum']
  ]
  for (let c of cases) {
    it(`should return an ascii string`, () => {
      let [value, expected] = c
      expect(toAscii(value)).to.be.deep.equal(expected)
    })
  }
})

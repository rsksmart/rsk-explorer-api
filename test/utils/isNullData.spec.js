import { isNullData } from '../../src/lib/utils'
import { expect } from 'chai'

const empty = [null, 0, '0x', '0x0', '0x00', undefined, false, '']
const notEmpty = [1, 'a', '0xa', '0x1', '12', true, 'blah']
const wrapStr = str => (typeof str === 'string') ? `"${str}"` : str

describe(`# isNullData`, function () {
  for (let c of empty) {
    it(`${wrapStr(c)} should be true`, () => {
      expect(isNullData(c)).to.be.equal(true)
    })
  }
  for (let c of notEmpty) {
    it(`${wrapStr(c)} should be false`, () => {
      expect(isNullData(c)).to.be.equal(false)
    })
  }
})

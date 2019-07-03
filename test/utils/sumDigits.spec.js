import { sumDigits } from '../../src/lib/utils'
import { expect } from 'chai'

const test = [
  [0, 0],
  ['0', 0],
  [12, 3],
  ['2222', 8]
]

describe(`#sumDigits`, function () {
  for (let t of test) {
    it(`${t[0]} should be ${t[1]}`, () => {
      expect(sumDigits(t[0])).to.be.deep.equal(t[1])
    })
  }
})

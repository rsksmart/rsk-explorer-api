import { isBlockHash } from '../../src/lib/utils'
import { expect } from 'chai'

const ok = [
  '0x9af4ce0342826e00540a269f9ae6e6c83cecb18fb9a375a4ff1171e3f1bb803d',
  '9af4ce0342826e00540a269f9ae6e6c83cecb18fb9a375a4ff1171e3f1bb803d']

const fail = [
  0x9af4ce0342826e00540a269f9ae6e6c83cecb18fb9a375a4ff1171e3f1bb803d,
  '0x9af4ce0342826e00540a269f9ae6e6c83cecb18fb9a375a4ff1171e3f1bb803z',
  '111111111111111111111111111111111111111111111111111111111111111',
  '122',
  2333333,
  '0xa89034',
  true,
  null,
  false
]

describe('isBlockHash', () => {
  fail.forEach(c => {
    it(`should return false: ${c}`, () => {
      expect(isBlockHash(c)).to.be.equal(false)
    })
  })
  ok.forEach(c => {
    it(`should return true ${c}`, () => {
      expect(isBlockHash(c)).to.be.equal(true)
    })
  })
})

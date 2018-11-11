import { isHexString } from '../../src/lib/utils'
import { assert } from 'chai'

const success = [
  '0x12',
  '0xAbcF12',
  '0040dcd4e575cc1b6a221676ced9478a9824513f',
  'e575cc1b6a221676ced9478a9824513f',
  '0x040dcd4e575cc1b6a221676ced9478a9824513f',
  '0x4fb291350c11da5be6ce96f19722565f2241eedf6be393fd79eea15e66ac7552']

const fail = [
  'Z',
  '0xz1234',
  'x1234a',
  'test'
]

describe('# isHexString', function () {
  success.forEach(v => {
    it(`${v} should be true`, function () {
      assert.isTrue(isHexString(v))
    })
  })
  fail.forEach(v => {
    it(`${v} should be false`, function () {
      assert.isNotTrue(isHexString(v))
    })
  })
})

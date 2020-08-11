import { assert } from 'chai'
import { InternalTx } from '../../src/services/classes/InternalTx'
import { fakeInternalTx, randomAddress } from '../shared'
const initConfig = {}

describe('# Internal Transactions', function () {

  describe('isSuicide()', function () {
    it('should be false', () => {
      let itx = new InternalTx(fakeInternalTx(), { initConfig })
      assert.isFalse(itx.isSuicide())
    })

    it('should be true', () => {
      let itx = new InternalTx(fakeInternalTx({ type: 'suicide', action: { address: randomAddress() } }), { initConfig })
      assert.isTrue(itx.isSuicide())
    })
  })
})

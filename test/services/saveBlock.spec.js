
import { expect } from 'chai'
import { Block } from '../../src/services/classes/Block'
import { nod3 } from '../../src/lib/nod3Connect'
import { testCollections, initConfig } from '../shared'

let blocks = [0x3e852, 141459, 3516, 792221, '0x3fee1ae875423c6fa405fdce0adcee0e6aadad85a941edaf3598f6d92efa846c']

describe('Save Block', function () {
  it('should be connected to RSK testnet', async function () {
    let net = await nod3.net.version()
    expect(net.id).to.be.equal('31')
  })
  for (let hashOrNumber of blocks) {
    describe(`Block #${hashOrNumber}`, function () {
      this.timeout(90000)
      it(`should save block ${hashOrNumber}`, async function () {
        this.timeout(60000)
        let collections = await testCollections(true)
        let block = new Block(hashOrNumber, { nod3, initConfig, collections, log: null })
        await block.fetch()
        let result = await block.save()
        expect(result).to.be.an('object')
      })
    })
  }
})

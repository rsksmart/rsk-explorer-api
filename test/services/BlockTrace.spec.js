import { expect } from 'chai'
import { BlockTrace } from '../../src/services/classes/BlockTrace'
import { randomBlockHash, testCollections } from '../shared'
const hash = randomBlockHash()
const initConfig = {}
let traced = 0
const nod3 = {
  trace:
  {
    block: (blockHash) => {
      ++traced
      return { blockHash, traced }
    }
  }
}

describe('# BlockTrace', function () {
  it('should get a block trace and save cache', async () => {
    const collections = await testCollections(true)
    const blockTrace = new BlockTrace(hash, { collections, initConfig, nod3 })
    let { traced, blockHash } = await blockTrace.fetch()
    expect(blockHash).equal(hash)
    expect(traced).equal(traced)
  })

  it('should return the cached trace', async () => {
    const collections = await testCollections()
    const blockTrace = new BlockTrace(hash, { collections, initConfig, nod3 })
    let { traced, blockHash } = await blockTrace.fetch()
    expect(blockHash).equal(hash)
    expect(traced).equal(1)
  })
})

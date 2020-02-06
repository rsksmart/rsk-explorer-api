import assert from 'assert'
import { BigNumber } from 'bignumber.js'
import { HashrateCalculator } from '../../src/api/lib/hashrateCalculator.js'

describe('hashrateCalculator', () => {
  const exa = (n) => new BigNumber(`${n}e18`)

  context('hashratePercentagePerMiner', () => {
    it('returns an empty object when argument is not an array', () => {
      const calc = new HashrateCalculator()

      const hashrate = calc.hashratePercentagePerMiner()

      assert.deepEqual(hashrate, {})
    })

    it('returns an empty object when no blocks', () => {
      const calc = new HashrateCalculator()

      const hashrate = calc.hashratePercentagePerMiner([])

      assert.deepEqual(hashrate, {})
    })

    it('returns 1 for only one miner and 1 block', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' }
      ]
      const hashrate = calc.hashratePercentagePerMiner(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': 1
      })
    })

    it('returns 0.5 for two miners that mined one block with the same block difficulty each', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
        { miner: '0x0b', difficulty: '0x11f36beaf6690ac7e6' }
      ]
      const hashrate = calc.hashratePercentagePerMiner(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': 0.5,
        '0x0b': 0.5
      })
    })

    it('returns 1 for one miner that mined more than one block', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e3' },
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e2' },
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e1' }
      ]
      const hashrate = calc.hashratePercentagePerMiner(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': 1
      })
    })

    it('returns 0.25 for four miners that mined one block with the same block difficulty each', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
        { miner: '0x0b', difficulty: '0x11f36beaf6690ac7e6' },
        { miner: '0x0c', difficulty: '0x11f36beaf6690ac7e6' },
        { miner: '0x0d', difficulty: '0x11f36beaf6690ac7e6' }
      ]
      const hashrate = calc.hashratePercentagePerMiner(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': 0.25,
        '0x0b': 0.25,
        '0x0c': 0.25,
        '0x0d': 0.25
      })
    })

    it('returns the corresponding value when four miners mine one block each with different difficulty', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
        { miner: '0x0b', difficulty: '0x13b768fb4f683f5fd5' },
        { miner: '0x0c', difficulty: '0x0f54a7810c212d7df0' },
        { miner: '0x0d', difficulty: '0x0f54a7810c212d7df0' }
      ]
      const hashrate = calc.hashratePercentagePerMiner(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': 0.263,
        '0x0b': 0.289,
        '0x0c': 0.224,
        '0x0d': 0.224
      })
    })

    it('returns the corresponding value when four miners mine several blocks each with different difficulty', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
        { miner: '0x0b', difficulty: '0x13b768fb4f683f5fd5' },
        { miner: '0x0a', difficulty: '0x13b768fb4f683f5fd5' },
        { miner: '0x0c', difficulty: '0x10050a0cc225820cdd' },
        { miner: '0x0d', difficulty: '0x10050a0cc225820cdd' },
        { miner: '0x0d', difficulty: '0x0f54a7810c212d7df0' },
        { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
        { miner: '0x0d', difficulty: '0x0f54a7810c212d7d00' },
        { miner: '0x0c', difficulty: '0x10050a0cc225820cdd' },
        { miner: '0x0b', difficulty: '0x10050a0cc225820fff' },
        { miner: '0x0d', difficulty: '0x11f36beaf6690ac7e6' }
      ]
      const hashrate = calc.hashratePercentagePerMiner(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': 0.296,
        '0x0b': 0.190,
        '0x0c': 0.170,
        '0x0d': 0.344
      })
    })
  })

  context('hashratePerMiner', () => {
    const START = 1

    it('returns an empty object when argument is not an array', () => {
      const calc = new HashrateCalculator()

      const hashrate = calc.hashratePerMiner()

      assert.deepEqual(hashrate, {})
    })

    it('returns an empty object when no blocks', () => {
      const calc = new HashrateCalculator()

      const hashrate = calc.hashratePerMiner([])

      assert.deepEqual(hashrate, {})
    })

    it('returns the same diff as hashrate for one block', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: exa(1), timestamp: START }
      ]
      const hashrate = calc.hashratePerMiner(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': '1.000 EHs'
      })
    })

    it('returns the cumulative diff divided the time elapsed between first and last block for one miner', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: exa(1), timestamp: START },
        { miner: '0x0a', difficulty: exa(1), timestamp: START + 1 },
        { miner: '0x0a', difficulty: exa(1), timestamp: START + 2 },
        { miner: '0x0a', difficulty: exa(1), timestamp: START + 3 },
        { miner: '0x0a', difficulty: exa(1), timestamp: START + 4 }
      ]
      const hashrate = calc.hashratePerMiner(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': '1.250 EHs'
      })
    })

    it('returns the cumulative diff divided the time elapsed between first and last block for multiple miners', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: exa(1), timestamp: START },
        { miner: '0x0b', difficulty: exa(2), timestamp: START + 1 },
        { miner: '0x0a', difficulty: exa(3), timestamp: START + 2 },
        { miner: '0x0c', difficulty: exa(4), timestamp: START + 3 },
        { miner: '0x0d', difficulty: exa(5), timestamp: START + 4 },
        { miner: '0x0a', difficulty: exa(6), timestamp: START + 5 },
        { miner: '0x0a', difficulty: exa(7), timestamp: START + 6 },
        { miner: '0x0b', difficulty: exa(8), timestamp: START + 7 },
        { miner: '0x0a', difficulty: exa(9), timestamp: START + 8 },
        { miner: '0x0c', difficulty: exa(10), timestamp: START + 9 },
        { miner: '0x0c', difficulty: exa(11), timestamp: START + 10 }
      ]
      const hashrate = calc.hashratePerMiner(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': '2.600 EHs', // 26
        '0x0b': '1.000 EHs', // 10
        '0x0c': '2.500 EHs', // 25
        '0x0d': '0.500 EHs' // 5
      })
    })
  })

  context('hashrates', () => {
    const START = 1

    it('returns the cumulative diff divided the time elapsed between first and last block for multiple miners', () => {
      const calc = new HashrateCalculator()

      const blocks = [
        { miner: '0x0a', difficulty: exa(1), timestamp: START },
        { miner: '0x0b', difficulty: exa(2), timestamp: START + 1 },
        { miner: '0x0a', difficulty: exa(3), timestamp: START + 2 },
        { miner: '0x0c', difficulty: exa(4), timestamp: START + 3 },
        { miner: '0x0d', difficulty: exa(5), timestamp: START + 4 },
        { miner: '0x0a', difficulty: exa(6), timestamp: START + 5 },
        { miner: '0x0a', difficulty: exa(7), timestamp: START + 6 },
        { miner: '0x0b', difficulty: exa(8), timestamp: START + 7 },
        { miner: '0x0a', difficulty: exa(9), timestamp: START + 8 },
        { miner: '0x0c', difficulty: exa(10), timestamp: START + 9 },
        { miner: '0x0c', difficulty: exa(11), timestamp: START + 10 }
      ]
      const hashrate = calc.hashrates(blocks)

      assert.deepEqual(hashrate, {
        '0x0a': { avg: '2.600 EHs', perc: 0.394 }, // 26
        '0x0b': { avg: '1.000 EHs', perc: 0.152 }, // 10
        '0x0c': { avg: '2.500 EHs', perc: 0.379 }, // 25
        '0x0d': { avg: '0.500 EHs', perc: 0.076 } // 5
      })
    })
  })
})

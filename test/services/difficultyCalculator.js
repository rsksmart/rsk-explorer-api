import assert from 'assert'

import BigNumber from 'bignumber.js'
import { DifficultyCalculator } from '../../src/api/lib/difficultyCalculator.js'

describe('difficultyCalculator', () => {
  const minutes = (m) => m * 60 * 1000
  const exa = (n) => new BigNumber(`${n}e50`)
  const epoch = (dateString) => +new Date(dateString)

  context('difficulties, 10 minute buckets', () => {
    const BUCKET_SIZE = minutes(10)
    const START = epoch('2019-01-01T12:00:00')

    it('returns an empty array when no argument', () => {
      const calc = new DifficultyCalculator()

      const diffs = calc.difficulties(null, START, epoch('2019-01-01T12:10:00'), BUCKET_SIZE)

      assert.deepEqual(diffs, [])
    })

    it('returns an array with one empty bucket when no blocks are supplied, end time is bigger than start time and time range suggests one bucket', () => {
      const calc = new DifficultyCalculator()

      const diffs = calc.difficulties([], START, epoch('2019-01-01T12:09:59'), BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: epoch('2019-01-01T12:00:00'), avg: exa(0) }
      ])
    })

    it('returns an array with one empty bucket when no blocks are supplied, end time equals start time and time range suggests one bucket', () => {
      const calc = new DifficultyCalculator()

      const diffs = calc.difficulties([], START, START, BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: epoch('2019-01-01T12:00:00'), avg: exa(0) }
      ])
    })

    it('returns an array with N empty bucket when no blocks are supplied and time range suggests N buckets', () => {
      const calc = new DifficultyCalculator()

      // one day in 10 minute buckets: 2019-01-01T12:00:00 to 2019-01-01T11:50:00
      const diffs = calc.difficulties([], START, epoch('2019-01-02T11:50:00'), BUCKET_SIZE)
      // all averages should be 0
      const summedAvgs = diffs.map(d => d.avg).reduce((a, b) => a.plus(b))

      assert.equal(diffs.length, 144)
      assert.equal(summedAvgs, 0)
    })

    it('returns an empty array when start time is bigger than end time', () => {
      const calc = new DifficultyCalculator()

      const blocks = [
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:00:00') }
      ]

      // expected: one bucket for 2019-01-01T12:00:00
      const diffs = calc.difficulties(blocks, START, START - 1, BUCKET_SIZE)

      assert.deepEqual(diffs, [])
    })

    it('returns an array with one element when argument is a one ordered block array with exact bucket timestamp', () => {
      const calc = new DifficultyCalculator()

      const blocks = [
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:00:00') }
      ]

      // expected: one bucket for 2019-01-01T12:00:00
      const diffs = calc.difficulties(blocks, START, epoch('2019-01-01T12:09:59'), BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: epoch('2019-01-01T12:00:00'), avg: exa(1) }
      ])
    })

    it('returns an array with one element with the average when argument is a two ordered block array which fall under the same bucket', () => {
      const calc = new DifficultyCalculator()

      const blocks = [
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:00') },
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:09:59') }
      ]

      // expected: one bucket for 2019-01-01T12:00:00
      const diffs = calc.difficulties(blocks, START, epoch('2019-01-01T12:00:59'), BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: epoch('2019-01-01T12:00:00'), avg: exa(1.5) }
      ])
    })

    it('returns an array with two element when argument is a two ordered block array which fall under different buckets', () => {
      const calc = new DifficultyCalculator()

      const blocks = [
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:00') },
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:10:00') }
      ]

      const diffs = calc.difficulties(blocks, START, epoch('2019-01-01T12:10:00'), BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: epoch('2019-01-01T12:00:00'), avg: exa(2) },
        { timestamp: epoch('2019-01-01T12:10:00'), avg: exa(1) }
      ])
    })

    it('returns an array with two element with the average of each bucket when argument is a four ordered block array which fall under different buckets', () => {
      const calc = new DifficultyCalculator()

      const blocks = [
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:00') },
        { difficulty: exa(4), timestamp: epoch('2019-01-01T12:00:01') },
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:10:00') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:19:59') }
      ]

      const diffs = calc.difficulties(blocks, START, epoch('2019-01-01T12:19:59'), BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: epoch('2019-01-01T12:00:00'), avg: exa(3) },
        { timestamp: epoch('2019-01-01T12:10:00'), avg: exa(1.5) }
      ])
    })

    it('returns an array with many elements with the average of each bucket when argument is a ordered block array which fall under different buckets', () => {
      const calc = new DifficultyCalculator()

      const blocks = [
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:00') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:01') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:10:00') },
        { difficulty: exa(4), timestamp: epoch('2019-01-01T12:19:59') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:25:00') },
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:26:00') },
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:32:59') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T13:34:59') }
      ]

      const diffs = calc.difficulties(blocks, START, epoch('2019-01-01T13:40:00'), BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: epoch('2019-01-01T12:00:00'), avg: exa(2) },
        { timestamp: epoch('2019-01-01T12:10:00'), avg: exa(3) },
        { timestamp: epoch('2019-01-01T12:20:00'), avg: exa(1.5) },
        { timestamp: epoch('2019-01-01T12:30:00'), avg: exa(1) },

        { timestamp: epoch('2019-01-01T12:40:00'), avg: exa(0) },
        { timestamp: epoch('2019-01-01T12:50:00'), avg: exa(0) },
        { timestamp: epoch('2019-01-01T13:00:00'), avg: exa(0) },
        { timestamp: epoch('2019-01-01T13:10:00'), avg: exa(0) },
        { timestamp: epoch('2019-01-01T13:20:00'), avg: exa(0) },

        { timestamp: epoch('2019-01-01T13:30:00'), avg: exa(2) },

        { timestamp: epoch('2019-01-01T13:40:00'), avg: exa(0) }
      ])
    })

    it('returns an array with many elements with the average of each bucket when argument is a unordered block array which fall under different buckets', () => {
      const calc = new DifficultyCalculator()

      const blocks = [
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:32:59') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:00') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:01') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T13:34:59') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:25:00') },
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:26:00') },
        { difficulty: exa(4), timestamp: epoch('2019-01-01T12:19:59') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:10:00') }
      ]

      const diffs = calc.difficulties(blocks, START, epoch('2019-01-01T13:40:00'), BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: epoch('2019-01-01T12:00:00'), avg: exa(2) },
        { timestamp: epoch('2019-01-01T12:10:00'), avg: exa(3) },
        { timestamp: epoch('2019-01-01T12:20:00'), avg: exa(1.5) },
        { timestamp: epoch('2019-01-01T12:30:00'), avg: exa(1) },

        { timestamp: epoch('2019-01-01T12:40:00'), avg: exa(0) },
        { timestamp: epoch('2019-01-01T12:50:00'), avg: exa(0) },
        { timestamp: epoch('2019-01-01T13:00:00'), avg: exa(0) },
        { timestamp: epoch('2019-01-01T13:10:00'), avg: exa(0) },
        { timestamp: epoch('2019-01-01T13:20:00'), avg: exa(0) },

        { timestamp: epoch('2019-01-01T13:30:00'), avg: exa(2) },

        { timestamp: epoch('2019-01-01T13:40:00'), avg: exa(0) }
      ])
    })

    it('ignores blocks outside the specified time range', () => {
      const calc = new DifficultyCalculator()

      const blocks = [
        { difficulty: exa(2), timestamp: epoch('2019-01-01T11:59:59') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:00') },
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:10:00') }
      ]

      const diffs = calc.difficulties(blocks, START, epoch('2019-01-01T12:09:59'), BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: epoch('2019-01-01T12:00:00'), avg: exa(2) }
      ])
    })

    it('handles start timestamps which are not a multiple of the bucket size (one bucket)', () => {
      const calc = new DifficultyCalculator()

      // slightly above 2019-01-01T12:00:00
      const start = epoch('2019-01-01T12:00:00.500')

      const blocks = [
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:00.000') }, // should not be in range (start - 500)
        { difficulty: exa(4), timestamp: epoch('2019-01-01T12:00:01.000') }, // should be in range (start + 500)
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:10:00.000') }, // should be in range (start + minutes(10) - 1000)
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:10:00.500') } // should not be in range (start + minutes(10) + 500)
      ]

      const diffs = calc.difficulties(blocks, start, start + BUCKET_SIZE - 1, BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: start, avg: exa(2.5) }
      ])
    })

    it('handles start timestamps which are not a multiple of the bucket size (multiple buckets)', () => {
      const calc = new DifficultyCalculator()

      // slightly above 2019-01-01T12:00:00
      const start = epoch('2019-01-01T12:00:00.500')

      const blocks = [
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:00:00.000') }, // should not be in range (start - 500)
        { difficulty: exa(4), timestamp: epoch('2019-01-01T12:00:01.000') }, // should be in range (start + 500)
        { difficulty: exa(3), timestamp: epoch('2019-01-01T12:29:00.000') }, // should be in range (start + minutes(9) - 1000)
        { difficulty: exa(1), timestamp: epoch('2019-01-01T12:30:00.000') }, // should be in range (start + minutes(10) - 1000)
        { difficulty: exa(2), timestamp: epoch('2019-01-01T12:30:00.500') } // should not be in range (start + minutes(10) + 500)
      ]

      const diffs = calc.difficulties(blocks, start, start + 3 * BUCKET_SIZE - 1, BUCKET_SIZE)

      assert.deepEqual(diffs, [
        { timestamp: start, avg: exa(4) },
        { timestamp: start + BUCKET_SIZE, avg: exa(0) },
        { timestamp: start + 2 * BUCKET_SIZE, avg: exa(2) }
      ])
    })
  })
})

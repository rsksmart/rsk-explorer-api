import { generateBuckets } from '../../../src/api/lib/DataCollector/buckets'
import { expect } from 'chai'

describe(`Buckets`, function () {
  describe('generateBuckets()', function () {
    let field = 'fieldName'
    let bucketSize = 11
    let startValue = 50
    let endValue = 295
    let { $match, $bucket } = generateBuckets(field, { bucketSize, startValue, endValue })

    it('$match', () => {
      expect($match).to.be.an('object', 'match should be an object')
      expect($match[field]).to.be.an('object')
      expect($match[field].$gte).to.be.equal(startValue)
      expect($match[field].$lt).to.be.equal(endValue)
    })

    it('$bucket should be a well formed bucket object', () => {
      expect($bucket).to.be.an('object')
      expect($bucket.groupBy).to.be.equal(`$${field}`)
      expect($bucket).haveOwnProperty('boundaries')
      expect($bucket).haveOwnProperty('default')
    })

    it('$bucket boundaries', () => {
      expect($bucket.boundaries).to.be.an('array')
      expect($bucket.boundaries[0]).to.be.equal(startValue)
      expect($bucket.boundaries.length).to.be.equal(Math.ceil((endValue - startValue) / bucketSize) + 1)
      expect($bucket.boundaries.pop()).to.be.equal(endValue)
    })
  })
})

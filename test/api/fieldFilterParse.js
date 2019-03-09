import { fieldFilterParse } from '../../src/lib/DataCollector/DataCollectorItem'
import { expect } from 'chai'

const value = ['a', 'b', 'c']
const spec = [
  {
    field: 'test',
    value,
    spec: { test: { $in: value } }
  },
  {
    field: 'field',
    value: { a: true, b: false, c: true },
    spec: { field: { $in: ['a', 'c'], $nin: ['b'] } }
  },
  {
    query: { a: 10 },
    value: { a: false },
    spec: { a: 10 }
  },
  {
    field: 'b',
    query: { x: 'test' },
    value: { a: 0, b: false, x: 1 },
    spec: { x: 'test', b: { $nin: ['a', 'b'], $in: ['x'] } }
  }

]

describe(`# fieldFilterParse`, () => {
  for (let s of spec) {
    const { field, value, query } = s
    let res = fieldFilterParse(field, value, query)
    it('# field', () => {
      if (field) {
        expect(res).has.ownProperty(field)
        expect(res[field]).to.be.deep.equal(s.spec[field])
      }
    })
    it('# query', () => {
      if (query) {
        expect(res).includes(query)
        expect(res).to.be.deep.equals(s.spec)
      }
    })
  }
})

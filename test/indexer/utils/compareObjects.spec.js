import { expect } from 'chai'
import { compareObjects } from './compareObjects.js'

describe('compareObjects', () => {
  // Primitive value tests
  describe('primitive values', () => {
    it('should pass when comparing identical primitive values', () => {
      expect(() => compareObjects(5, 5)).to.not.throw()
      expect(() => compareObjects('test', 'test')).to.not.throw()
      expect(() => compareObjects(true, true)).to.not.throw()
    })

    it('should fail when comparing different primitive values', () => {
      expect(() => compareObjects(5, 6)).to.throw()
      expect(() => compareObjects('test', 'test2')).to.throw()
      expect(() => compareObjects(true, false)).to.throw()
    })
  })

  // Simple object tests
  describe('simple objects', () => {
    it('should pass when comparing identical objects', () => {
      const obj1 = { a: 1, b: 'string', c: true }
      const obj2 = { a: 1, b: 'string', c: true }
      expect(() => compareObjects(obj1, obj2)).to.not.throw()
    })

    it('should fail when comparing objects with different values', () => {
      const obj1 = { a: 1, b: 'string', c: true }
      const obj2 = { a: 1, b: 'different', c: true }
      expect(() => compareObjects(obj1, obj2)).to.throw()
    })

    it('should fail when actual object has extra properties', () => {
      const actual = { a: 1, b: 'string', c: true, extra: 'should fail' }
      const expected = { a: 1, b: 'string', c: true }
      expect(() => compareObjects(actual, expected)).to.throw(/unexpected extra property/)
    })

    it('should fail when expected property is missing from actual object', () => {
      const actual = { a: 1, b: 'string' }
      const expected = { a: 1, b: 'string', c: true }
      expect(() => compareObjects(actual, expected)).to.throw()
    })
  })

  // Nested object tests
  describe('nested objects', () => {
    it('should pass when comparing identical nested objects', () => {
      const obj1 = { a: 1, b: { c: 'test', d: { e: true } } }
      const obj2 = { a: 1, b: { c: 'test', d: { e: true } } }
      expect(() => compareObjects(obj1, obj2)).to.not.throw()
    })

    it('should fail when nested objects differ', () => {
      const obj1 = { a: 1, b: { c: 'test', d: { e: true } } }
      const obj2 = { a: 1, b: { c: 'test', d: { e: false } } }
      expect(() => compareObjects(obj1, obj2)).to.throw()
    })
  })

  // Array tests
  describe('arrays', () => {
    it('should pass when comparing identical arrays of primitives', () => {
      const arr1 = [1, 2, 3, 'test']
      const arr2 = [1, 2, 3, 'test']
      expect(() => compareObjects(arr1, arr2)).to.not.throw()
    })

    it('should fail when arrays have different lengths', () => {
      const arr1 = [1, 2, 3]
      const arr2 = [1, 2, 3, 4]
      expect(() => compareObjects(arr1, arr2)).to.throw()
    })

    it('should fail when arrays have different primitive values', () => {
      const arr1 = [1, 2, 3, 'test']
      const arr2 = [1, 2, 3, 'different']
      expect(() => compareObjects(arr1, arr2)).to.throw()
    })

    it('should pass when comparing arrays of objects in any order', () => {
      const arr1 = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ]
      const arr2 = [
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
        { id: 1, name: 'Alice' }
      ]
      expect(() => compareObjects(arr1, arr2)).to.not.throw()
    })

    it('should fail when an expected object is missing from actual array', () => {
      const arr1 = [
        { id: 1, name: 'Alice' },
        { id: 3, name: 'Charlie' }
      ]
      const arr2 = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ]
      expect(() => compareObjects(arr1, arr2)).to.throw()
    })
  })

  // Objects containing arrays
  describe('objects containing arrays', () => {
    it('should pass when comparing objects with identical arrays', () => {
      const obj1 = { a: 1, items: [1, 2, 3, { b: 'test' }] }
      const obj2 = { a: 1, items: [1, 2, 3, { b: 'test' }] }
      expect(() => compareObjects(obj1, obj2)).to.not.throw()
    })

    it('should fail when arrays within objects differ', () => {
      const obj1 = { a: 1, items: [1, 2, 3] }
      const obj2 = { a: 1, items: [1, 2, 4] }
      expect(() => compareObjects(obj1, obj2)).to.throw()
    })
  })

  // Arrays containing arrays
  describe('arrays containing arrays', () => {
    it('should pass when comparing identical nested arrays', () => {
      const arr1 = [1, [2, 3], [4, [5, 6]]]
      const arr2 = [1, [2, 3], [4, [5, 6]]]
      expect(() => compareObjects(arr1, arr2)).to.not.throw()
    })

    it('should fail when nested arrays differ', () => {
      const arr1 = [1, [2, 3], [4, [5, 6]]]
      const arr2 = [1, [2, 3], [4, [5, 7]]]
      expect(() => compareObjects(arr1, arr2)).to.throw()
    })
  })

  // Edge cases
  describe('edge cases', () => {
    it('should handle null values correctly', () => {
      const obj1 = { a: null, b: 'test' }
      const obj2 = { a: null, b: 'test' }
      expect(() => compareObjects(obj1, obj2)).to.not.throw()
    })

    it('should fail when comparing null vs non-null', () => {
      const obj1 = { a: null, b: 'test' }
      const obj2 = { a: 42, b: 'test' }
      expect(() => compareObjects(obj1, obj2)).to.throw()
    })

    it('should handle undefined values correctly', () => {
      const obj1 = { a: undefined, b: 'test' }
      const obj2 = { a: undefined, b: 'test' }
      expect(() => compareObjects(obj1, obj2)).to.not.throw()
    })

    it('should handle empty objects correctly', () => {
      expect(() => compareObjects({}, {})).to.not.throw()
    })

    it('should handle empty arrays correctly', () => {
      expect(() => compareObjects([], [])).to.not.throw()
    })
  })

  // Complex nested structures
  describe('complex nested structures', () => {
    it('should handle deeply nested mixed structures', () => {
      const complex1 = {
        id: 1,
        name: 'Complex',
        settings: {
          enabled: true,
          values: [1, 2, 3],
          config: {
            theme: 'dark',
            items: [
              { id: 1, details: { active: true } },
              { id: 2, details: { active: false } }
            ]
          }
        }
      }

      const complex2 = {
        id: 1,
        name: 'Complex',
        settings: {
          enabled: true,
          values: [1, 2, 3],
          config: {
            theme: 'dark',
            items: [
              { id: 2, details: { active: false } },
              { id: 1, details: { active: true } }
            ]
          }
        }
      }

      expect(() => compareObjects(complex1, complex2)).to.not.throw()
    })

    it('should fail on differences in deeply nested structures', () => {
      const complex1 = {
        id: 1,
        settings: {
          config: {
            items: [
              { id: 1, details: { active: true } }
            ]
          }
        }
      }

      const complex2 = {
        id: 1,
        settings: {
          config: {
            items: [
              { id: 1, details: { active: false } }
            ]
          }
        }
      }

      expect(() => compareObjects(complex1, complex2)).to.throw()
    })
  })

  // Add a new section for extra property testing
  describe('extra property detection', () => {
    it('should fail when actual has extra top-level properties', () => {
      const actual = { a: 1, b: 2, c: 3 }
      const expected = { a: 1, b: 2 }
      expect(() => compareObjects(actual, expected)).to.throw(/"c" is an unexpected extra property/)
    })

    it('should fail when actual has extra nested properties', () => {
      const actual = { a: 1, b: { c: 2, d: 3, extra: 'bad' } }
      const expected = { a: 1, b: { c: 2, d: 3 } }
      expect(() => compareObjects(actual, expected)).to.throw(/"b.extra" is an unexpected extra property/)
    })

    it('should fail when array objects have extra properties', () => {
      const actual = [
        { id: 1, name: 'Alice', extra: 'data' },
        { id: 2, name: 'Bob' }
      ]
      const expected = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]
      expect(() => compareObjects(actual, expected)).to.throw(/unexpected extra property/)
    })

    it('should pass when objects match exactly with no extra properties', () => {
      const actual = { a: 1, b: { c: 2, d: { e: 3 } } }
      const expected = { a: 1, b: { c: 2, d: { e: 3 } } }
      expect(() => compareObjects(actual, expected)).to.not.throw()
    })
  })
})

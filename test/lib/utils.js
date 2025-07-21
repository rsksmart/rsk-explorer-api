const { expect } = require('chai')
const { removeNullCharacters, sanitizeString } = require('../../src/lib/utils')

const testCases = {
  controlCharacters: [
    // base cases
    { input: 'Hello World', expected: 'Hello World' },
    { input: '', expected: '' },
    { input: null, expected: null },
    { input: undefined, expected: undefined },
    { input: 123, expected: 123 },
    // null characters
    { input: 'Hello\x00World\x00', expected: 'HelloWorld' },
    { input: '\x00\x00\x00', expected: '' }
  ]
}

describe('utils', () => {
  describe('removeNullCharacters()', () => {
    it('should remove null characters from strings', () => {
      testCases.controlCharacters.forEach(({ input, expected }) => {
        const result = removeNullCharacters(input)
        expect(result).to.equal(expected)
      })
    })
  })

  describe('sanitizeString()', () => {
    Object.entries(testCases).forEach(([testCaseName, testCases]) => {
      it(`should handle [${testCaseName}]`, () => {
        testCases.forEach(({ input, expected }) => {
          const result = sanitizeString(input)
          expect(result).to.equal(expected)
        })
      })
    })
  })
})

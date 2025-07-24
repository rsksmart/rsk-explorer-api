import { expect } from 'chai'
import {
  removeNonPrintableControlCharacters,
  removeLineBreaksAndTabs,
  limitStringLength,
  limitStringTo256,
  sanitizeString,
  sanitizeContractNameOrSymbol
} from '../../src/lib/utils'

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
    { input: '\x00\x00\x00', expected: '' },
    // other control characters
    { input: 'Hello\x01World\x02', expected: 'HelloWorld' },
    { input: 'Test\x07\x08\x0B\x0C', expected: 'Test' },
    { input: 'Data\x0E\x0F\x1F\x7F', expected: 'Data' },
    { input: 'Mixed\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0B\x0C\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F\x7F', expected: 'Mixed' },
    // preserve essential whitespace (tabs, newlines, carriage returns)
    { input: 'Hello\tWorld\nNew\x00Line\rEnd', expected: 'Hello\tWorld\nNewLine\rEnd' },
    { input: 'Tab\x09here\x0Aand\x0Dnewline', expected: 'Tab\there\nand\rnewline' }
  ],
  lineBreaksAndTabs: [
    // base cases
    { input: 'Hello World', expected: 'Hello World' },
    { input: '', expected: '' },
    { input: null, expected: null },
    { input: undefined, expected: undefined },
    { input: 123, expected: 123 },
    // tabs
    { input: 'Hello\tWorld', expected: 'HelloWorld' },
    { input: '\tTabbed\tContent\t', expected: 'TabbedContent' },
    // line feeds
    { input: 'Hello\nWorld', expected: 'HelloWorld' },
    { input: 'Line1\nLine2\nLine3', expected: 'Line1Line2Line3' },
    // carriage returns
    { input: 'Hello\rWorld', expected: 'HelloWorld' },
    { input: 'Line1\rLine2\rLine3', expected: 'Line1Line2Line3' },
    // mixed whitespace characters
    { input: 'Hello\tWorld\nNew\rLine', expected: 'HelloWorldNewLine' },
    { input: 'Tab\x09here\x0Aand\x0Dnewline', expected: 'Tabhereandnewline' },
    { input: 'Complex\tstring\nwith\r\nmixed\x09\x0A\x0Dchars', expected: 'Complexstringwithmixedchars' }
  ],
  stringLength: [
    // base cases
    { input: 'Hello World', maxLength: 20, expected: 'Hello World' },
    { input: '', maxLength: 10, expected: '' },
    { input: null, maxLength: 10, expected: null },
    { input: undefined, maxLength: 10, expected: undefined },
    { input: 123, maxLength: 10, expected: 123 },
    // truncation cases
    { input: 'Hello World', maxLength: 5, expected: 'Hello' },
    { input: 'Very long string that should be truncated', maxLength: 10, expected: 'Very long ' },
    { input: 'Exact length', maxLength: 12, expected: 'Exact length' },
    { input: 'Too long', maxLength: 7, expected: 'Too lon' }
  ],
  stringTo256: [
    // base cases
    { input: 'Hello World', expected: 'Hello World' },
    { input: '', expected: '' },
    { input: null, expected: null },
    { input: undefined, expected: undefined },
    { input: 123, expected: 123 },
    // truncation cases
    { input: 'a'.repeat(300), expected: 'a'.repeat(256) },
    { input: 'a'.repeat(256), expected: 'a'.repeat(256) },
    { input: 'a'.repeat(255), expected: 'a'.repeat(255) }
  ],
  contractNameOrSymbol: [
    // base cases
    { input: 'Hello World', expected: 'Hello World' },
    { input: '', expected: '' },
    { input: null, expected: null },
    { input: undefined, expected: undefined },
    { input: 123, expected: 123 },
    // control characters
    { input: 'Token\x00Name', expected: 'TokenName' },
    { input: 'Symbol\x01\x02\x03', expected: 'Symbol' },
    // line breaks and tabs
    { input: 'Contract\tName\nSymbol', expected: 'ContractNameSymbol' },
    { input: 'Token\r\nDAO', expected: 'TokenDAO' },
    // length truncation
    { input: 'a'.repeat(300), expected: 'a'.repeat(256) },
    // combined cases
    { input: 'Token\x00Name\t\n\r' + 'a'.repeat(300), expected: 'TokenName' + 'a'.repeat(247) }
  ],
  sanitizeStringDefault: [
    // base cases
    { input: 'Hello World', expected: 'Hello World' },
    { input: '', expected: '' },
    { input: null, expected: null },
    { input: undefined, expected: undefined },
    { input: 123, expected: 123 },
    // control characters (should be removed)
    { input: 'Hello\x00World\x00', expected: 'HelloWorld' },
    { input: 'Token\x01\x02\x03', expected: 'Token' },
    // essential whitespace (should be preserved)
    { input: 'Hello\tWorld\nNew\x00Line\rEnd', expected: 'Hello\tWorld\nNewLine\rEnd' },
    { input: 'Tab\x09here\x0Aand\x0Dnewline', expected: 'Tab\there\nand\rnewline' },
    // mixed cases
    { input: 'Contract\tName\n\x00Symbol', expected: 'Contract\tName\nSymbol' }
  ]
}

describe('utils', () => {
  describe('removeNonPrintableControlCharacters()', () => {
    it('should remove control characters from strings while preserving essential whitespace', () => {
      testCases.controlCharacters.forEach(({ input, expected }) => {
        const result = removeNonPrintableControlCharacters(input)
        expect(result).to.equal(expected)
      })
    })
  })

  describe('removeLineBreaksAndTabs()', () => {
    it('should remove tabs, line feeds, and carriage returns from strings', () => {
      testCases.lineBreaksAndTabs.forEach(({ input, expected }) => {
        const result = removeLineBreaksAndTabs(input)
        expect(result).to.equal(expected)
      })
    })
  })

  describe('limitStringLength()', () => {
    it('should limit string length to specified maximum', () => {
      testCases.stringLength.forEach(({ input, maxLength, expected }) => {
        const result = limitStringLength(input, maxLength)
        expect(result).to.equal(expected)
      })
    })
  })

  describe('limitStringTo256()', () => {
    it('should limit string length to 256 characters', () => {
      testCases.stringTo256.forEach(({ input, expected }) => {
        const result = limitStringTo256(input)
        expect(result).to.equal(expected)
      })
    })
  })

  describe('sanitizeString()', () => {
    it('should handle default sanitization', () => {
      testCases.sanitizeStringDefault.forEach(({ input, expected }) => {
        const result = sanitizeString(input)
        expect(result).to.equal(expected)
      })
    })

    it('should handle custom sanitizers', () => {
      // Test with multiple sanitizers
      const result = sanitizeString('Hello\x00\tWorld\n', [
        removeNonPrintableControlCharacters,
        removeLineBreaksAndTabs
      ])
      expect(result).to.equal('HelloWorld')
    })
  })

  describe('sanitizeContractNameOrSymbol()', () => {
    it('should sanitize contract names and symbols', () => {
      testCases.contractNameOrSymbol.forEach(({ input, expected }) => {
        const result = sanitizeContractNameOrSymbol(input)
        expect(result).to.equal(expected)
      })
    })
  })
})

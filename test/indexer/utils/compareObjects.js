import { expect } from 'chai'

/**
 * Recursively compares objects, tracking paths for clear error messages.
 * Handles nested objects, arrays, and detects extra properties.
 */
export const compareObjects = (actual, expected, path = '') => {
  // Handle null or undefined
  if (expected === null || expected === undefined) {
    return expect(actual, `Value at ${path || 'root'} should match expected`).to.deep.equal(expected)
  }

  // Handle arrays
  if (Array.isArray(expected)) {
    return compareArrays(actual, expected, path)
  }

  // Handle objects
  if (typeof expected === 'object') {
    return compareNestedObjects(actual, expected, path)
  }

  // Handle primitive values
  expect(actual, `Value at ${path || 'root'} should match expected`).to.deep.equal(expected)
}

/**
 * Compares arrays, handling both primitive values and objects within arrays
 */
const compareArrays = (actual, expected, path) => {
  // Verify actual is an array
  // eslint-disable-next-line no-unused-expressions
  expect(Array.isArray(actual), `${path} should be an array`).to.be.true

  // Check lengths match
  expect(
    actual.length,
    `"${path}" arrays should have the same length (actual: ${actual.length}, expected: ${expected.length})`
  ).to.equal(expected.length)

  // Check all expected values are in actual
  for (let i = 0; i < expected.length; i++) {
    const expectedItem = expected[i]
    const currentPath = path ? `${path}[${i}]` : `[${i}]`

    if (typeof expectedItem === 'object' && expectedItem !== null) {
      compareObjectInArray(actual, expectedItem, currentPath)
    } else {
      // For primitive values, check inclusion
      expect(actual, `${currentPath} value ${expectedItem} should be included in array`)
        .to.include(expectedItem)
    }
  }
}

/**
 * Creates a simplified summary of an object for error messages
 */
const getObjectSummary = (obj) => {
  if (!obj || typeof obj !== 'object') return String(obj)

  const keys = Object.keys(obj)
  if (keys.length === 0) return '{}'

  // Show all keys and their values with appropriate formatting
  const summary = keys.map(k => {
    const val = obj[k]
    if (val === null) return `${k}: null`
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return `${k}: [${val.length > 0 ? '...' : ''}]`
      }
      return `${k}: {...}`
    }
    // Truncate string values if they're too long
    return `${k}: ${String(val).substring(0, 30)}${String(val).length > 30 ? '...' : ''}`
  }).join(', ')

  return `{ ${summary} }`
}

/**
 * Finds and compares an object within an array of objects
 */
const compareObjectInArray = (actualArray, expectedObject, path) => {
  let matchFound = false
  let extraPropertyError = null

  for (const actualItem of actualArray) {
    try {
      compareObjects(actualItem, expectedObject, path)
      matchFound = true
      break
    } catch (e) {
      // Prioritize extra property errors
      if (e.message.includes('unexpected extra property')) {
        extraPropertyError = e
      }
    }
  }

  // If we found an extra property error, throw it instead of the generic "no match found" error
  if (!matchFound && extraPropertyError) {
    throw extraPropertyError
  }

  // eslint-disable-next-line no-unused-expressions
  expect(matchFound, `Couldn't find matching object in array for "${path}"`).to.be.true
}

/**
 * Compares nested objects and ensures no extra properties exist
 */
const compareNestedObjects = (actual, expected, path) => {
  // Check all expected properties exist in actual
  for (const key in expected) {
    const currentPath = path ? `${path}.${key}` : key

    // Ensure property exists
    expect(actual, `Property "${currentPath}" should exist in actual object`).to.have.property(key)

    if (typeof expected[key] === 'object' && expected[key] !== null) {
      compareObjects(actual[key], expected[key], currentPath)
    } else {
      expect(actual[key], `Property "${currentPath}" should match expected value`)
        .to.deep.equal(expected[key])
    }
  }

  // Check no extra properties exist in actual
  for (const key in actual) {
    // Skip function properties when checking for extras
    if (typeof actual[key] === 'function') {
      continue
    }

    const currentPath = path ? `${path}.${key}` : key

    if (!expected.hasOwnProperty(key)) {
      const expectedSummary = getObjectSummary(expected)
      const actualSummary = getObjectSummary(actual)
      throw new Error(
        `"${currentPath}" is an unexpected extra property in actual object.` +
        `\nExpected object: ${expectedSummary}` +
        `\nActual object: ${actualSummary}` +
        `\nPath: ${path || 'root object'}`
      )
    }
  }
}

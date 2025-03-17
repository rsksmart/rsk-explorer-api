import { expect } from 'chai'

// Function to recursively compare object properties
export const compareObjects = (actual, expected) => {
  for (const key in expected) {
    if (typeof expected[key] === 'object' && expected[key] !== null) {
      compareObjects(actual[key], expected[key])
    } else {
      expect(actual[key]).to.deep.equal(expected[key])
    }
  }
}

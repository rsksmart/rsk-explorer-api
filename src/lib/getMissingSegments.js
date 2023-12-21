export function getMissingSegments (toBlock, blocksNumbers) {
  toBlock = toBlock > 0 ? toBlock : 0
  const dbEmpty = blocksNumbers.length === 0

  if (dbEmpty) {
    // only segment is from toBlock to 0
    return [[toBlock, 0]]
  } else {
    blocksNumbers.unshift(toBlock)
    return findMissingSegments(blocksNumbers)
  }
}

// boundaries are included for insertions
function findMissingSegments (array) {
  if (array[array.length - 1] > 0) array.push(-1) // to also consider block 0
  return array
    .filter((value, index) => array[index + 1] - value < -1) // numbers with missing parent block (or upperBound)
    .map(upperBound => { // return boundaries
      const lowerBound = array.find((value, index) => value < upperBound && array[index - 1] - value > 1) // get lowerBound for each upperBound
      return [upperBound - 1, lowerBound + 1]
    })
}

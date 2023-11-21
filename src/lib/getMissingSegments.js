export function getMissingSegments (latestBlock, blocksNumbers) {
  const segments = []
  const dbEmpty = blocksNumbers.length === 0

  if (dbEmpty) {
    // only segment is from latest to 0
    segments.push([latestBlock, 0])
  } else {
    const latestDbBlock = blocksNumbers[0]
    if (latestBlock !== latestDbBlock) {
      // consider the segment from latest to latestDbBlock
      segments.push([latestBlock, latestDbBlock + 1])
    }
    // consider all segments between numbers under latestDbBlock
    segments.push(...findMissingSegments([...blocksNumbers]))
  }

  return segments
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

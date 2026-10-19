import { expect } from 'chai'
import { blocksRepository } from '../../../src/repositories'
import { blockData, erc721, erc20, erc1155Single, erc1155Batch, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000f0721'
const C1155 = '0x000000000000000000000000000000000f001155'
const C20 = '0x0000000000000000000000000000000000000020'
const ADDRESSES = [ZERO, ...['1', '2', '3', '4', '5'].map(digit => `0x${digit.repeat(40)}`)]
const HEIGHTS = 25
const STEPS = 120
const SEEDS = [1, 2, 3, 4, 5, 6]

function seededRandom (seed) {
  let state = seed >>> 0
  const randomBelow = limit => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296 * limit) | 0
  }
  return { randomBelow, pickOne: list => list[randomBelow(list.length)] }
}

function randomLog ({ randomBelow, pickOne }) {
  const logKind = randomBelow(5)
  if (logKind === 3) return erc20(C20, pickOne(ADDRESSES), pickOne(ADDRESSES), randomBelow(1000))
  if (logKind === 4) return erc20(C721, pickOne(ADDRESSES), pickOne(ADDRESSES), randomBelow(1000))
  if (logKind === 0) return erc721(C721, pickOne(ADDRESSES), pickOne(ADDRESSES), 1 + randomBelow(6))
  if (logKind === 1) return erc1155Single(C1155, pickOne(ADDRESSES), pickOne(ADDRESSES), 1 + randomBelow(4), randomBelow(5))
  const count = 1 + randomBelow(3)
  return erc1155Batch(
    C1155,
    pickOne(ADDRESSES),
    pickOne(ADDRESSES),
    Array.from({ length: count }, () => 1 + randomBelow(4)),
    Array.from({ length: count }, () => randomBelow(5))
  )
}

function nextOperation ({ pickOne }, storedIndexes, missingIndexes) {
  if (!storedIndexes.length) return 'insert'
  if (!missingIndexes.length) return pickOne(['deleteOne', 'deleteSuffix', 'deleteSet'])
  return pickOne(['insert', 'insert', 'insert', 'deleteOne', 'deleteSuffix', 'deleteSet'])
}

integrationDescribe('NFT ownership: saveBlockData and the repository delete in random order', function () {
  this.timeout(600000)

  for (const seed of SEEDS) {
    it(`equals a replay of the stored blocks after every operation (seed ${seed})`, async () => {
      const random = seededRandom(seed)
      const { randomBelow, pickOne } = random
      const blockVersions = Array.from({ length: HEIGHTS }, (_, index) => ['a', 'b', 'c'].map(tag => ({
        number: (index + 1) * 10,
        tag,
        logs: Array.from({ length: randomBelow(5) }, () => randomLog(random))
      })))
      const blockNumberAt = index => blockVersions[index][0].number
      const stored = new Map()
      await resetDatabase()

      for (let step = 0; step < STEPS; step++) {
        const missingIndexes = blockVersions.map((_, index) => index).filter(index => !stored.has(index))
        const storedIndexes = [...stored.keys()]
        const operation = nextOperation(random, storedIndexes, missingIndexes)

        if (operation === 'insert') {
          const index = pickOne(missingIndexes)
          const version = pickOne(blockVersions[index])
          await blocksRepository.saveBlockData(blockData(version.number, version.tag, version.logs))
          stored.set(index, version)
        } else if (operation === 'deleteOne') {
          const index = pickOne(storedIndexes)
          expect(await blocksRepository.deleteOne({ number: blockNumberAt(index) })).to.deep.equal({ count: 1 })
          stored.delete(index)
        } else if (operation === 'deleteSuffix') {
          const firstDeleted = pickOne(storedIndexes)
          const deletedIndexes = blockVersions.map((_, index) => index).filter(index => index >= firstDeleted)
          const count = deletedIndexes.filter(index => stored.has(index)).length
          expect(await blocksRepository.deleteMany({ number: { in: deletedIndexes.map(blockNumberAt) } })).to.deep.equal({ count })
          deletedIndexes.forEach(index => stored.delete(index))
        } else {
          const chosenIndexes = storedIndexes.filter(() => randomBelow(2))
          expect(await blocksRepository.deleteMany({ number: { in: chosenIndexes.map(blockNumberAt) } }))
            .to.deep.equal({ count: chosenIndexes.length })
          chosenIndexes.forEach(index => stored.delete(index))
        }

        const found = await differences()
        expect(found, `seed ${seed} step ${step} ${operation} (stored ${stored.size}/${HEIGHTS})`).to.deep.equal([])
      }
    })
  }
})

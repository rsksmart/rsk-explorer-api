import { expect } from 'chai'
import { blocksRepository } from '../../../src/repositories'
import { blockData, erc721, erc20, erc1155Single, erc1155Batch, ZERO } from './fixtures'
import { integrationDescribe, resetDatabase, differences } from './replay'

const C721 = '0x00000000000000000000000000000000000f0721'
const C1155 = '0x000000000000000000000000000000000f001155'
const C20 = '0x0000000000000000000000000000000000000020'
const PEOPLE = [ZERO, ...['1', '2', '3', '4', '5'].map(x => `0x${x.repeat(40)}`)]
const HEIGHT = 25
const STEPS = 120
const SEEDS = [1, 2, 3, 4, 5, 6]

function generator (seed) {
  let state = seed >>> 0
  const rand = n => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296 * n) | 0
  }
  return { rand, pick: list => list[rand(list.length)] }
}

function randomLog ({ rand, pick }) {
  const kind = rand(5)
  if (kind === 3) return erc20(C20, pick(PEOPLE), pick(PEOPLE), rand(1000))
  if (kind === 4) return erc20(C721, pick(PEOPLE), pick(PEOPLE), rand(1000))
  if (kind === 0) return erc721(C721, pick(PEOPLE), pick(PEOPLE), 1 + rand(6))
  if (kind === 1) return erc1155Single(C1155, pick(PEOPLE), pick(PEOPLE), 1 + rand(4), rand(5))
  const n = 1 + rand(3)
  return erc1155Batch(C1155, pick(PEOPLE), pick(PEOPLE), Array.from({ length: n }, () => 1 + rand(4)), Array.from({ length: n }, () => rand(5)))
}

integrationDescribe('NFT ownership: saveBlockData and the repository delete in random order', function () {
  this.timeout(600000)

  for (const seed of SEEDS) {
    it(`equals a replay of the stored blocks after every operation (seed ${seed})`, async () => {
      const random = generator(seed)
      const { rand, pick } = random
      const versions = Array.from({ length: HEIGHT }, (_, i) => ['a', 'b', 'c'].map(tag => ({ number: (i + 1) * 10, tag, logs: Array.from({ length: rand(5) }, () => randomLog(random)) })))
      const stored = new Map()
      await resetDatabase()

      for (let step = 0; step < STEPS; step++) {
        const missing = versions.map((_, i) => i).filter(i => !stored.has(i))
        const present = [...stored.keys()]
        const op = !present.length ? 'insert' : !missing.length ? pick(['deleteOne', 'deleteSuffix', 'deleteSet']) : pick(['insert', 'insert', 'insert', 'deleteOne', 'deleteSuffix', 'deleteSet'])

        if (op === 'insert') {
          const i = pick(missing)
          const v = pick(versions[i])
          await blocksRepository.saveBlockData(blockData(v.number, v.tag, v.logs))
          stored.set(i, v)
        } else if (op === 'deleteOne') {
          const i = pick(present)
          expect(await blocksRepository.deleteOne({ number: versions[i][0].number })).to.deep.equal({ count: 1 })
          stored.delete(i)
        } else if (op === 'deleteSuffix') {
          const from = pick(present)
          const gone = versions.map((_, i) => i).filter(i => i >= from)
          const count = gone.filter(i => stored.has(i)).length
          expect(await blocksRepository.deleteMany({ number: { in: gone.map(i => versions[i][0].number) } })).to.deep.equal({ count })
          gone.forEach(i => stored.delete(i))
        } else {
          const set = present.filter(() => rand(2))
          expect(await blocksRepository.deleteMany({ number: { in: set.map(i => versions[i][0].number) } })).to.deep.equal({ count: set.length })
          set.forEach(i => stored.delete(i))
        }

        const diffs = await differences()
        expect(diffs, `seed ${seed} step ${step} ${op} (stored ${stored.size}/${HEIGHT})`).to.deep.equal([])
      }
    })
  }
})

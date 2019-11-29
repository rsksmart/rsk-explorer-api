import { expect } from 'chai'
import { isBlockObject } from '../../src/lib/utils'

import block1 from '../services/blockData/block-1234.json'

const block = block1.block.block

describe(`# isBlockObject`, function () {
  it(`a valid block should return true`, () => {
    expect(isBlockObject(block)).to.be.equal(true)
  })

  it(`empty arguments should return false`, () => {
    expect(isBlockObject()).to.be.equal(false)
  })

  it(`invalid number should return false`, () => {
    let test = Object.assign({}, block)
    test.number = undefined
    expect(isBlockObject(test)).to.be.equal(false)
    test.number = -1
    expect(isBlockObject(test)).to.be.equal(false)
  })

  it(`invalid hash should return false`, () => {
    let test = Object.assign({}, block)
    test.hash = `${test.hash}1`
    expect(isBlockObject(test)).to.be.equal(false)
    test.hash = undefined
    expect(isBlockObject(test)).to.be.equal(false)
  })

  it(`invalid miner should return false`, () => {
    let test = Object.assign({}, block)
    test.miner = `${test.miner}1`
    expect(isBlockObject(test)).to.be.equal(false)
    test.miner = undefined
    expect(isBlockObject(test)).to.be.equal(false)
  })

  it(`empty transactions should return false`, () => {
    let test = Object.assign({}, block)
    test.transactions = undefined
    expect(isBlockObject(test)).to.be.equal(false, 'transactions')
  })
})

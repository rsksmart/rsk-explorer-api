import { expect } from 'chai'
import { replaceImport } from '../../src/services/userEvents/ContractVerifierModule'

describe(`replace imports`, () => {
  const tests = [['ERC20.sol', 'import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";', 'import "./ERC20.sol";'],
  ['ERC20Detailed.sol', 'import "../../ERC20Detailed.sol";', 'import "./ERC20Detailed.sol";'],
  ['t2Xx_.xX_', 'import "/xX_dsd/test/t2Xx_.xX_";', 'import "./t2Xx_.xX_";']]
  for (let t of tests) {
    let [file, test, expected] = t
    it(`should replace import path with filename`, () => {
      let result = replaceImport(test, file)
      expect(result).to.be.equal(expected)
    })
  }
})

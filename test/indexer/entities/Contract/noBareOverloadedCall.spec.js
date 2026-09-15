import { expect } from 'chai'
import { execSync } from 'node:child_process'
import Contract from '../../../../src/services/classes/Contract'

const probeAddress = '0x11b64191106b1cf66fcd2f8389077c596cdc5646'
const initConfig = {
  id: 'explorerInitialConfig',
  nativeContracts: {
    bridge: '0x0000000000000000000000000000000001000006',
    remasc: '0x0000000000000000000000000000000001000008'
  },
  net: { id: '30', name: 'RSK Mainnet' }
}

const overloadedDefaultAbiNames = () => {
  const contract = new Contract(probeAddress, '0x00', { nod3: {}, initConfig, block: { number: 9000000 } })
  const abi = contract.getContractInstance().getAbi()
  const counts = new Map()
  for (const fragment of abi) {
    if (fragment && fragment.type === 'function') {
      counts.set(fragment.name, (counts.get(fragment.name) || 0) + 1)
    }
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name)
}

const bareCallsInSrc = (name) => {
  try {
    return execSync(`git grep -nE "(encodeCall|call)\\('${name}'" -- src`, { encoding: 'utf8' }).trim()
  } catch (error) {
    if (error.status === 1) return ''
    throw error
  }
}

describe('no bare overloaded method name in product code', () => {
  it('src/ never encodeCall/call a bare overloaded name from the default ABI', () => {
    const overloaded = overloadedDefaultAbiNames()

    expect(overloaded).to.include('balanceOf')

    for (const name of overloaded) {
      const found = bareCallsInSrc(name)
      expect(found, `bare '${name}' call in src/:\n${found}`).to.equal('')
    }
  })
})

import { txFormat, cfg, isDeployment } from '../../src/lib/txFormat'
import { assert } from 'chai'

const ok = [
  '0x0000000000000000000000000000000001000008',
  '0x010ae5e7f9a4dd7fb64d9f222e35db1a09036eaf',
  '0X010AE5E7F9A4DD7FB64D9F222E35DB1A09036AAF',
  '0x0000000000000000000000000000000000000000']

const fail = [
  null,
  0,
  '',
  false,
  undefined,
  0x00,
  '0x00',
  '0x00000000000000000000000000000000000000a'
]

const fakeTx = contractAddress => { return txFormat({ receipt: { contractAddress } }) }

describe('isDeployment', () => {

  describe('Not deployments', () => {
    fail.forEach(contractAddress => {
      let tx = fakeTx(contractAddress)
      it(`${contractAddress} -- ${tx.txType}`, () => {
        assert.isNotOk(isDeployment(tx))
      })
    })
  })

  describe('Contracts deployments', () => {
    ok.forEach(contractAddress => {
      let tx = fakeTx(contractAddress)
      it(`${contractAddress} -- ${tx.txType}`, () => {
        assert.isOk(isDeployment(tx))
      })
    })
  })
})



import { expect } from 'chai'
import { JsonRpcError } from '@rsksmart/nod3/dist/classes/JsonRpc'
import { countNodeCalls, REVERT_ERROR_CODE } from '../../src/lib/nodeCallStats'

const call = data => ({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: '0x1f0b19c7b76fe644797603daba7de4523c26bad2', data }, 'latest'] })
const NAME = '0x06fdde03'
const SUPPORTS_INTERFACE = '0x01ffc9a780ac58cd00000000000000000000000000000000000000000000000000000000'

const fakeNod3 = answer => ({ rpc: { send: async payload => answer(payload) } })
const settle = promise => promise.then(() => 'ok', error => error)

describe('countNodeCalls', () => {
  it('counts a revert as an answer, not as a node error', async () => {
    const { nod3, takeStats } = countNodeCalls(fakeNod3(() => { throw new JsonRpcError({ code: REVERT_ERROR_CODE, message: 'VM Exception while processing transaction: transaction reverted' }) }))

    const error = await settle(nod3.rpc.send(call(SUPPORTS_INTERFACE)))

    expect(error.errorCode).to.equal(REVERT_ERROR_CODE)
    expect(takeStats()).to.deep.include({ calls: 1, reverts: 1, nodeErrors: 0, tokenReadErrors: 0 })
  })

  it('counts a dropped connection and a non-revert JSON-RPC error as node errors, and a token read among them', async () => {
    const answers = [
      () => { throw Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }) },
      () => { throw new JsonRpcError({ code: -32602, message: 'Invalid block number 125000000' }) },
      () => '0x01'
    ]
    const { nod3, takeStats } = countNodeCalls(fakeNod3(() => answers.shift()()))

    await settle(nod3.rpc.send(call(NAME)))
    await settle(nod3.rpc.send(call(SUPPORTS_INTERFACE)))
    await settle(nod3.rpc.send(call(SUPPORTS_INTERFACE)))

    expect(takeStats()).to.deep.include({ calls: 3, reverts: 0, nodeErrors: 2, tokenReadErrors: 1, lastNodeError: 'Invalid block number 125000000' })
    expect(takeStats()).to.deep.include({ calls: 0, nodeErrors: 0 })
  })

  it('rejects and counts a request the node never answers', async () => {
    const { nod3, takeStats } = countNodeCalls(fakeNod3(() => new Promise(() => {})), { requestTimeoutMs: 20 })

    const error = await settle(nod3.rpc.send(call(NAME)))

    expect(error.message).to.equal('node request timed out after 20ms')
    expect(takeStats()).to.deep.include({ calls: 1, nodeErrors: 1, tokenReadErrors: 1 })
  })
})

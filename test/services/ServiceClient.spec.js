import { assert } from 'chai'
import { Service } from '../../src/services/Service/ServiceServer'
import { Client } from '../../src/services/Service/ServiceClient'
import { isPortInUse } from '../shared'

const host = '127.0.0.1'
const port = 3026
const uri = `${host}:${port}`
const events = [
  ['testEvent', 'testData'],
  ['fooEvent', { bob: 44, alice: '23' }],
  ['bar', 33]
]
const eventsReceived = []
const eventsSent = []
const name = 'TestClientServer'

let actions = {
  echo: (data) => data,
  wait: async (time) => {
    let start = Date.now()
    setTimeout(() => {
      let end = Date.now()
      let elapsed = end - time
      return { start, end, elapsed }
    }, time)
  }
}
let eventListener = (event, data) => {
  eventsSent.push([event, data])
}

describe(`Services.Client`, function () {
  let client, serviceName
  let service = Service(uri, { name }, ({ create }) => {
    create.Emitter()
    create.Listener(eventListener)
    create.Worker(actions)
  })

  it('should create a service', async () => {
    await service.start()
    let started = await isPortInUse(port)
    assert.equal(started, true)
    assert.typeOf(service.emit, 'function')
  })

  it('should create a Client', async () => {
    ({ client, serviceName } = await Client(uri))
    assert.equal(serviceName, name)
    assert.typeOf(client.join, 'function')
    assert.typeOf(client.leave, 'function')
    assert.typeOf(client.send, 'function')
    assert.typeOf(client.run, 'function')
  })

  it('should join to event emitter', async () => {
    let emitter = await client.join({})
    assert.equal(emitter.constructor.name, 'ClientReadableStream')
    emitter.on('data', ({ event, data }) => {
      eventsReceived.push([event, JSON.parse(data)])
    })
  })

  it('should send events', () => {
    for (let [event, data] of events) {
      service.emit(event, data)
    }
  })

  it('should receive events', () => {
    assert.deepEqual(eventsReceived, events)
  })

  it('should send tasks to the worker and receive the results', async () => {
    let msg = { Bob: 83, Alice: 27 }
    let { result } = await client.run({ action: 'echo', args: [msg] })
    assert.equal(JSON.parse(result), msg)
  })

})

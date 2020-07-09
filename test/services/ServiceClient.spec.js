import { assert } from 'chai'
import { Service } from '../../src/services/Service/ServiceServer'
import { Client } from '../../src/services/Service/ServiceClient'
import { isPortInUse } from '../shared'

const host = '127.0.0.1'
const port = 3026
const uri = `${host}:${port}`
const events = [
  ['testEvent', { test: 'testData' }],
  ['fooEvent', { bob: 44, alice: '23' }],
  ['bar', { bar: '33' }]
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
  let client, serviceName, emitter
  let service = Service(uri, { name }, ({ create }) => {
    create.Emitter()
    create.Listener(eventListener)
    create.Worker(actions)
  })
/*   this.afterAll(() => {
    emitter.cancel()
    client.close()
    service.stop()
  }) */
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
    emitter = await client.join('user')
    assert.equal(emitter.constructor.name, 'ClientReadableStream')
    emitter.on('newEvent', ({ event, data }) => {
      eventsReceived.push([event, data])
    })
  })

  it('should emit events', () => {
    for (let [event, data] of events) {
      service.emit(event, data)
    }
  })

  it('should receive events', () => {
    assert.deepEqual(eventsReceived, events)
  })

  it('should receive events', async () => {
    let event = 'sendEvent'
    let data = { foo: 'bar' }
    await client.send(event, data)
    assert.deepEqual(eventsSent[0], [event, data])
  })

  it('should send tasks to the worker and receive the results', async () => {
    let msg = 'test'
    let { result } = await client.run('echo', [msg])
    assert.equal(result, msg)
  })
})

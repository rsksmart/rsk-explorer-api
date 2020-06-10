import { assert } from 'chai'
import { Service, clientCredentials } from '../../src/services/Service/ServiceServer'
import { PROTO } from '../../src/services/Service/serviceProto'
import { isPortInUse } from '../shared'

const credentials = clientCredentials()

const host = '127.0.0.1'
const port = 3026
const uri = `${host}:${port}`

describe('# Services', function () {
  describe('Service', function () {
    it('should create and start a service', async () => {
      let service = Service(uri)
      assert.typeOf(service.start, 'function')
      assert.typeOf(service.stop, 'function')
      assert.typeOf(service.getServer, 'function')
      assert.typeOf(service.getInfo, 'function')
      assert.typeOf(service.getUri, 'function')
      await service.start()
      let isUp = await isPortInUse(port)
      assert.equal(isUp, true)
      service.stop()
      isUp = await isPortInUse(port)
      assert.equal(isUp, false)
    })

    it('should create a service with options', () => {
      let name = 'TestService'
      let service = Service(uri, { name })
      assert.equal(service.getInfo().name, name)
      assert.equal(service.getUri(), uri)
    })

    describe('worker, grpc client', function () {
      it('should create a worker', async () => {
        let sum = (a, b) => parseInt(a) + parseInt(b)
        let service = Service(uri, {}, ({ create }) => {
          create.Worker({ sum })
        })
        let { protos } = service.getInfo()
        assert.equal(protos.length, 1)
        await service.start()

        let client = new PROTO[protos[0]](uri, credentials)
        assert.typeOf(client.run, 'function')

        let result = await new Promise((resolve, reject) => {
          client.run({ action: 'sum', args: [2, 5] }, (err, { result }) => {
            if (err) reject(err)
            resolve(result)
          })
        })
        assert.equal(result, 7)
        service.stop()
      })
    })
    describe('listener, grpc client', function () {
      it('should create a emitter', async () => {
        let msgs = []
        let eventHandler = (event, data) => msgs.push({ event, data })

        let service = Service(uri, {}, ({ create }) => {
          create.Listener(eventHandler)
        })
        let { protos } = service.getInfo()
        assert.equal(protos.length, 1)
        await service.start()

        let client = new PROTO[protos[0]](uri, credentials)
        assert.typeOf(client.send, 'function')
        let event = { event: 'testEvent', data: 'testData' }
        await new Promise((resolve, reject) => {
          client.send(event, (err, res) => {
            if (err) reject(err)
            resolve(res)
          })
        })
        assert.deepEqual(msgs[0], event)
        service.stop()
      })
    })

    describe('emitter, grpc client', function () {
      let service, client, events
      let msgs = []

      it('create a emitter, grpc client', async function () {
        service = Service(uri, {}, ({ create }) => {
          create.Emitter()
        })
        let { protos } = service.getInfo()
        assert.equal(protos.length, 1)
        assert.typeOf(service.emit, 'function')
        await service.start()
        client = new PROTO[protos[0]](uri, credentials)
        assert.typeOf(client.join, 'function')

        events = client.join({ user: 'test' })
        assert.equal(events.constructor.name, 'ClientReadableStream')
        events.on('error', err => {
          console.error(err)
        })

        events.on('data', ({ event, data }) => {
          msgs.push({ event, data })
        })
      })

      it('should emit events', () => {
        service.emit('data', 'test')
        service.emit('data', 'test')
      })

      it('should listen to events', async function () {
        assert.equal(msgs.length, 2)
        let [msg] = msgs
        assert.equal(msg.event, 'data')
        assert.equal(msg.data, 'test')
        client.leave(null, () => { })
        client.close()
        // service.stop()
      })
    })
  })
})

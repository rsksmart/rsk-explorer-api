import { assert } from 'chai'
import { Service, clientCredentials } from '../../src/services/Service/ServiceServer'
import { PROTO, Struct, MESSAGES } from '../../src/services/Service/serviceProto'
import { isPortInUse } from '../shared'

const credentials = clientCredentials()

const host = '127.0.0.1'
const port = 9026
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
          const msg = new MESSAGES.WorkerRequest(['sum', ['2', '5']])
          /*
          msg.setAction('sum')
          msg.addArgs('2')
          msg.addArgs('5')
          msg.setArgsList(['2', '5'])
          */
          client.run(msg, (err, response) => {
            if (err) reject(err)
            let res = response.getResult()
            let { result } = res.toJavaScript()
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
        let eventHandler = (event, data) => {
          msgs.push({ event, data })
        }

        let service = Service(uri, {}, ({ create }) => {
          create.Listener(eventHandler)
        })
        let { protos } = service.getInfo()
        assert.equal(protos.length, 1)
        await service.start()

        let client = new PROTO[protos[0]](uri, credentials)
        assert.typeOf(client.send, 'function')
        let event = 'testEvent'
        let data = { test: 'testData' }
        let request = new MESSAGES.EventRequest([event])
        // request.setEvent(event)
        request.setData(Struct.fromJavaScript(data))
        await new Promise((resolve, reject) => {
          client.send(request, (err, response) => {
            if (err) reject(err)
            resolve(response.toString())
          })
        })
        assert.deepEqual(msgs[0].event, event)
        assert.deepEqual(msgs[0].data, data)
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
        assert.typeOf(service.getJoined, 'function')
        await service.start()
        client = new PROTO[protos[0]](uri, credentials)
        assert.typeOf(client.join, 'function')

        const request = new MESSAGES.JoinRequest()
        request.setUser('Johny')
        events = client.join(request)
        assert.equal(events.constructor.name, 'ClientReadableStream')

        events.on('error', err => {
          console.error(err)
        })

        events.on('data', (request) => {
          let event = request.getEvent()
          let data = request.getData().toJavaScript()
          msgs.push({ event, data })
        })
      })

      it('should emit events', () => {
        service.emit('data', { test: 'test' })
        service.emit('data', { test: 'test' })
      })

      it('should return joined clients', async () => {
        assert.equal(service.getJoined().length, 1)
      })

      it('should listen to events', async function () {
        assert.equal(msgs.length, 2)
        let [msg] = msgs
        assert.equal(msg.event, 'data')
        assert.deepEqual(msg.data, { test: 'test' })
        // service.stop()
      })
      it('should leave a channel', async () => {
        await client.leave(new MESSAGES.Empty(), () => { })
        client.close()
      })
    })
  })
})

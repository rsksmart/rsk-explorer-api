import { Service, clientCredentials } from '../../src/services/Service/ServiceServer'
import { Client } from '../../src/services/Service/ServiceClient'
import { Router } from '../../src/services/Router'
import { assert } from 'chai'
import { isPortInUse, asyncWait } from '../shared'

const address = '127.0.0.1'
const servicesNames = ['router', 'serviceA', 'serviceB']
const startPort = 3020
const services = servicesNames.reduce((v, name, i) => {
  let port = startPort + i
  let uri = `${address}:${port}`
  v[name] = { uri, port, name }
  return v
}, {})

const eventsReceived = servicesNames.reduce((v, name) => {
  v[name] = []
  return v
}, {})

const eventHandler = (event, data, serviceName) => {
  serviceName = serviceName || 'router'
  eventsReceived[serviceName].push({ event, data })
}

const executor = serviceName => {
  return ({ create }) => {
    create.Emitter()
    create.Listener((event, data) => eventHandler(event, data, serviceName))
  }
}

const createService = serviceName => {
  const { uri, name } = services[serviceName]
  return Service(uri, { name }, executor(name))
}

const routerService = createService('router')
const serviceA = createService('serviceA')
const serviceB = createService('serviceB')

describe('Router', function () {
  this.timeout(60000)
  let router

  this.afterAll(async () => {
    routerService.stop()
    router.stop()
    serviceA.stop()
    serviceB.stop()
  })
  it('should create and start a service', async () => {
    routerService.start()
    let inUse = await isPortInUse(services.router.port)
    assert.isTrue(inUse)
  })

  it('should create a Router', () => {
    router = Router({ service: routerService })
    assert.typeOf(router.start, 'function')
    assert.typeOf(router.stop, 'function')
    assert.typeOf(router.addService, 'function')
    assert.typeOf(router.removeService, 'function')
    assert.typeOf(router.getServices, 'function')
    assert.typeOf(router.broadcast, 'function')
    assert.deepEqual(router.getServices(), [])
  })

  it('should add services to router, and skip the router service', () => {
    for (let name in services) {
      router.addService(name, services[name])
    }
    assert.deepEqual(router.getServices().length, Object.keys(services).length - 1)
    assert.deepEqual(router.getServices(), Object.keys(services).filter(k => k !== 'router'))
  })

  it('router should discover services', async () => {
    router.start()
    assert.notInclude(router.getClients(), services.serviceA.uri)
    await serviceA.start()
    let sa = await isPortInUse(services.serviceA.port)
    assert.isTrue(sa)
    await asyncWait(1000)
    assert.include(router.getClients(), services.serviceA.uri)
    await serviceB.start()
    await asyncWait(1000)
    assert.include(router.getClients(), services.serviceB.uri)
  })

  it('router should broadcast messages', async () => {
    assert.include(router.getClients(), services.serviceA.uri)
    assert.include(router.getClients(), services.serviceB.uri)
    let event = 'testEvent'
    let data = { test: Date.now() }
    await router.broadcast(event, data)
    await asyncWait(10)
    assert.deepInclude(eventsReceived.serviceA, { event, data })
    assert.deepInclude(eventsReceived.serviceB, { event, data })
  })

  it('router should forward messages between clients', async () => {
    assert.include(router.getClients(), services.serviceA.uri)
    assert.include(router.getClients(), services.serviceB.uri)
    let event = 'serviceEvent'
    let data = { test: Date.now() }
    await serviceA.emit(event, data)
    await asyncWait(10)
    assert.deepInclude(eventsReceived.serviceB, { event, data })
    assert.notDeepInclude(eventsReceived.serviceA, { event, data })
  })

  it('the router should create an event listener server', async () => {
    let { client } = await Client(services.router.uri, clientCredentials())
    assert.typeOf(client.send, 'function')
  })

  it('the router should listen to events', async () => {
    let { client } = await Client(services.router.uri, clientCredentials())
    let event = 'clientEvent'
    let data = { date: Date.now() }
    await client.send(event, data)
    assert.deepInclude(eventsReceived.router, { event, data })
  })

  it(`router status should return the status of clients`, async () => {
    let serviceName = 'test'
    let a = router.addService(serviceName, { uri: `${address}:9999` })
    assert.isTrue(a)
    await router.discover()
    let status = router.status()
    assert.includeMembers(Object.keys(services).concat([serviceName]), Object.keys(status))
    assert.isNull(status.test)
    for (let name of Object.keys(services).filter(n => n !== 'router')) {
      assert.equal(status[name], services[name].uri)
    }
  })
})

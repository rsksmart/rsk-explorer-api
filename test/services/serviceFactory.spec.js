import { assert } from 'chai'
import { ports, services, createService } from '../../src/services/serviceFactory'
import { servicesNames } from '../../src/services/servicesConfig'
import config from '../../src/lib/config'
const { blocks } = config
const { address } = blocks

describe('ServiceFactory', function () {
  describe('ports', function () {
    it('ports should be an object', () => {
      assert.typeOf(ports, 'object')
    })
    it('ports.next should be a function', () => {
      assert.typeOf(ports.next, 'function')
    })
    it('ports.assigned should be an array', () => {
      assert.isArray(ports.assigned)
    })
  })
  describe('services', function () {
    it('services should be an object', () => {
      assert.typeOf(services, 'object')
    })

    it('all services should be defined', () => {
      for (let sk in servicesNames) {
        assert.isDefined(services[sk])
      }
    })
    it('each service definition should be valid', () => {
      for (let sk in services) {
        let serviceConfig = services[sk]
        assert.isDefined(servicesNames[sk])
        assert.propertyVal(serviceConfig, 'address', address)
        assert.property(serviceConfig, 'port')
        assert.propertyVal(serviceConfig, 'uri', `${address}:${serviceConfig.port}`)
        assert.propertyVal(serviceConfig, 'name', servicesNames[sk])
      }
    })
  })
  describe('createService', function () {
    for (let sk in services) {
      let serviceConfig = services[sk]
      it(`should create ${sk} service`, async () => {
        let service = await createService(serviceConfig)
        assert.typeOf(service, 'object')
        assert.property(service, 'service')
        assert.property(service, 'log')
        assert.property(service, 'startService')
        assert.typeOf(service.startService, 'function')
      })
    }
  })
})

import { assert } from 'chai'
import { ports, createService, getEnabledServices, services } from '../../src/services/serviceFactory'
import { servicesNames } from '../../src/services/servicesConfig'
import { config } from '../shared'
const { blocks } = config
const { address } = blocks

describe('ServiceFactory', function () {

  describe('getEnabledServices()', function () {

    it('as default all services should be enabled', () => {
      assert.deepEqual(getEnabledServices(), servicesNames)
    })

    it('config.block.services should disable services', () => {
      const keys = Object.keys(servicesNames)
      let config = {}
      config[keys[0]] = false
      config[keys[1]] = false
      config[keys[2]] = false
      const enabled = getEnabledServices(config)
      assert.isUndefined(enabled[keys[0]])
      assert.isUndefined(enabled[keys[1]])
      assert.isUndefined(enabled[keys[2]])
    })
  })

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

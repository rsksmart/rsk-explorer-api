import { assert } from 'chai'
import { createPorts, createServices } from '../../src/services/servicesConfig'

const configPorts = [1, 2, 10]

describe('Services config', function () {

  describe('createPorts', function () {
    const ports = createPorts(configPorts)
    it('should return ports in order', () => {
      for (let port of configPorts) {
        let next = ports.next()
        assert.equal(next, port)
      }
      assert.deepEqual(ports.assigned, configPorts)
    })

    it(`should return next ports starting from the last`, () => {
      const nextPorts = [11, 12, 13]
      for (let port of nextPorts) {
        assert.equal(ports.next(), port)
      }
      assert.deepEqual(ports.assigned, configPorts.concat(nextPorts))
    })
  })
  describe('createServices', function () {
    const ports = createPorts([1, 2, 3])
    const services = createServices('127.0.0.1', ports)
    it(`should return services config`, () => {
      assert.typeOf(services, 'object')
      const keys = Object.keys(services)
      for (let key in keys) {
        let name = keys[key]
        let service = services[name]
        assert.typeOf(service, 'object')
        assert.property(service, 'name')
        assert.property(service, 'address')
        assert.propertyVal(service, 'port', ports.assigned[key])
      }
    })
  })
})

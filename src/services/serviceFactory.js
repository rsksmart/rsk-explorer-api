import config from '../lib/config'
import { Logger } from '../lib/Logger'
import { createPorts, createServices } from './servicesConfig'
import { Service } from './Service/ServiceServer'
import { Router } from './Router'

const { blocks } = config
const { address } = blocks

export const ports = createPorts(blocks.ports.map(p => parseInt(p)))

export const services = createServices(address, ports)

export const createServiceLogger = ({ name, uri }) => {
  if (!name || !uri) throw new Error('Missing log options')
  return Logger(`${name}|${uri}`)
}

export async function createService (serviceConfig, executor, { log } = {}) {
  try {
    const { uri, name, address, port } = serviceConfig
    log = log || createServiceLogger(serviceConfig)
    const service = Service(uri, { name }, executor)
    const startService = createStartService(service, { name, address, port }, { log })
    return { service, log, startService }
  } catch (err) {
    return Promise.reject(err)
  }
}

export function createStartService (service, { name, address, port }, { log }) {
  return async () => {
    try {
      let listenPort = await service.start()
      if (listenPort !== port) throw new Error('Binding port mismatch')
      if (log) log.info(`Service ${name} listening on ${address}:${port}`)
      return listenPort
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

export async function createRouter (routerServiceConfig, { services, log }) {
  try {
    services = services || {}
    log = log || createServiceLogger(routerServiceConfig)
    const router = Router({ log })
    const executor = ({ create }) => {
      create.Emitter()
      create.Listener(router.broadcast)
    }
    const { service, startService } = await createService(routerServiceConfig, executor, { log })
    for (let s in services) {
      let config = services[s]
      let { name } = config
      if (config.uri !== routerServiceConfig.uri) {
        router.addService(name, config)
      }
    }
    router.setRouterService(service)
    return Object.freeze({ router, startService, log })
  } catch (err) {
    return Promise.reject(err)
  }
}

import config from '../lib/config'
import { Logger } from '../lib/Logger'
import { createPorts, createServices } from './servicesConfig'
import { Service } from './Service/ServiceServer'

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
    const { uri, name, address } = serviceConfig
    log = log || createServiceLogger(serviceConfig)
    const service = Service(uri, { name }, executor)
    const startService = async () => {
      try {
        let port = await service.start()
        if (port !== serviceConfig.port) throw new Error('Binding port mismatch')
        log.info(`Service ${name} listening on ${address}:${port}`)
      } catch (err) {
        return Promise.reject(err)
      }
    }
    return { service, log, startService }
  } catch (err) {
    return Promise.reject(err)
  }
}

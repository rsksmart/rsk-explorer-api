
import { Client } from './Service/ServiceClient'

export function Router ({ service, log } = {}) {
  log = log || console
  service = service || {}
  const services = new Map()
  const clients = new Map()
  let discovering = false
  let cancelStart

  const setRouterService = routerService => {
    service = routerService
  }

  const eventListener = ({ uri, name }, { event, data }) => {
    log.info(`Broadcasting ${event} from ${name}@${uri}`)
    broadcast(event, data, [uri])
  }

  const addClient = async ({ uri, name }) => {
    try {
      if (clients.has(uri)) return clients[uri]
      if (uri === service.getUri()) return
      const res = await Client(uri).catch(err => {
        if (err.code === 14) return Promise.resolve()
        else throw err
      })
      if (!res) return
      const { client, serviceName } = res
      if (serviceName !== name) throw new Error(`Service name mismatch: ${name}/${serviceName}`)
      if (client.join) {
        let events = client.join()
        events.on('newEvent', (data) => {
          eventListener({ uri, name }, data)
        })
        events.on('error', (err) => {
          if (err.code === 14) {
            log.warn(`The client ${name}@${uri} was disconnected`)
          } else {
            log.error(err)
          }
          clients.delete(uri)
          start()
        })
      }
      clients.set(uri, client)
      return client
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const addService = (name, config) => {
    if (!name) throw new Error(`Invalid name ${name}`)
    if (typeof config !== 'object') throw new Error('Config must be an object')
    if (!config.uri) throw new Error(`Invalid uri, ${name}`)
    if (service.getUri && config.uri === service.getUri()) return
    if (services.has(name)) throw new Error(`The service ${name} already exists`)
    services.set(name, config)
    return services.has(name)
  }

  const removeService = name => {
    if (!services.has(name)) throw new Error(`Unknown service ${name}`)
    services.delete(name)
  }

  const broadcast = (event, data, skipClients = []) => {
    if (!Array.isArray(skipClients)) throw new Error('SkipClients must be an array')
    if (service.emit) {
      service.emit(event, data)
    }
    // filter sender and subscribers
    let clientsToSend = [...clients].filter(([uri, client]) => {
      return !skipClients.includes(uri)
    })
    for (let cs of clientsToSend) {
      let client = cs[1]
      if (client.send) client.send(event, data)
    }
  }

  const getServices = () => {
    return [...services.keys()]
  }

  const getClients = () => {
    return [...clients.keys()]
  }

  const discover = async () => {
    try {
      const discovered = []
      if (services.size < 1) throw new Error('There not configured services')
      log.info('Discovering services')
      for (let { uri, name } of services.values()) {
        let client = await addClient({ uri, name })
        if (client) discovered.push(client)
      }
      return discovered
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const status = () => {
    return [...services.entries()]
      .map(([name, { uri }]) => { return [name, clients.has(uri) ? uri : null] })
      .reduce((v, a) => {
        let [name, uri] = a
        v[name] = uri
        return v
      }, {})
  }

  const allServicesWereDiscovered = () => {
    return services.size === clients.size
  }

  const restart = () => {
    const time = (allServicesWereDiscovered()) ? 60000 : 1000
    cancelStart = setTimeout(() => {
      start()
    }, time)
  }
  const start = async () => {
    try {
      if (discovering) return
      if (allServicesWereDiscovered()) return restart()
      discovering = true
      let discovered = await discover()
      if (discovered.length) {
        log.info(`${discovered.length} services discovered`)
      }
      if (!allServicesWereDiscovered()) {
        log.debug(`Clients:`, status())
      }
      discovering = false
      restart()
    } catch (err) {
      log.error(err)
      process.exit(9)
    }
  }

  const stop = () => {
    if (cancelStart) clearTimeout(cancelStart)
    for (let [uri, client] of clients) {
      log.info(`Closing connection to ${uri}`)
      client.close()
    }
    clients.clear()
    services.clear()
  }
  return Object.freeze({
    setRouterService,
    service,
    start,
    stop,
    addService,
    removeService,
    getServices,
    getClients,
    discover,
    broadcast,
    status
  })
}

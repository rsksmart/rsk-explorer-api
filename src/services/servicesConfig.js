
export const servicesNames = {
  ROUTER: 'blocksRouter',
  LISTENER: 'blocksListener',
  REQUESTER: 'blocksRequester',
  CHECKER: 'blocksChecker',
  TXPOOL: 'txPool',
  BALANCES: 'blocksBalances',
  STATUS: 'blocksStatus',
  STATS: 'blocksStats'
}

export function createServices (address, ports, enabledServices) {
  enabledServices = enabledServices || servicesNames
  let services = {}
  for (let type in enabledServices) {
    let name = enabledServices[type]
    let port = ports.next()
    let uri = `${address}:${port}`
    services[type] = { address, port, uri, name }
  }
  return services
}

export function createPorts (ports) {
  let index = 0
  let assigned = []
  const next = () => {
    let port = ports[index] || assigned[assigned.length - 1] + 1
    assigned.push(port)
    index++
    return port
  }
  return Object.freeze({ next, assigned })
}

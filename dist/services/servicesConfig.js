"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createServices = createServices;exports.createPorts = createPorts;exports.servicesNames = void 0;
const servicesNames = {
  ROUTER: 'blocksRouter',
  LISTENER: 'blocksListener',
  REQUESTER: 'blocksRequester',
  CHECKER: 'blocksChecker',
  TXPOOL: 'txPool',
  BALANCES: 'blocksBalances',
  STATUS: 'blocksStatus',
  STATS: 'blocksStats' };exports.servicesNames = servicesNames;


function createServices(address, ports) {
  let services = {};
  for (let type in servicesNames) {
    let name = servicesNames[type];
    let port = ports.next();
    let uri = `${address}:${port}`;
    services[type] = { address, port, uri, name };
  }
  return services;
}

function createPorts(ports) {
  let index = 0;
  let assigned = [];
  const next = () => {
    let port = ports[index] || assigned[assigned.length - 1] + 1;
    assigned.push(port);
    index++;
    return port;
  };
  return Object.freeze({ next, assigned });
}
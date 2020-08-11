"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.createService = createService;exports.createStartService = createStartService;exports.createRouter = createRouter;exports.bootStrapService = bootStrapService;exports.getEnabledServices = getEnabledServices;exports.createServiceLogger = exports.services = exports.enabledServices = exports.ports = void 0;var _config = _interopRequireDefault(require("../lib/config"));
var _dataSource = require("../lib/dataSource");
var _Logger = require("../lib/Logger");
var _servicesConfig = require("./servicesConfig");
var _ServiceServer = require("./Service/ServiceServer");
var _Router = require("./Router");
var _types = require("../lib/types");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const { blocks } = _config.default;
const { address } = blocks;

const ports = (0, _servicesConfig.createPorts)(blocks.ports.map(p => parseInt(p)));exports.ports = ports;

const enabledServices = getEnabledServices(blocks.services);exports.enabledServices = enabledServices;

const services = (0, _servicesConfig.createServices)(address, ports, enabledServices);exports.services = services;

const createServiceLogger = ({ name, uri }) => {
  if (!name || !uri) throw new Error('Missing log options');
  return (0, _Logger.Logger)(`${name}|${uri}`);
};exports.createServiceLogger = createServiceLogger;

async function createService(serviceConfig, executor, { log } = {}) {
  try {
    const { uri, name, address, port } = serviceConfig;
    log = log || createServiceLogger(serviceConfig);
    const service = (0, _ServiceServer.Service)(uri, { name }, executor);
    const startService = createStartService(service, { name, address, port }, { log });
    return { service, log, startService };
  } catch (err) {
    return Promise.reject(err);
  }
}

function createStartService(service, { name, address, port }, { log }) {
  return async () => {
    try {
      let listenPort = await service.start();
      if (listenPort !== port) throw new Error('Binding port mismatch');
      if (log) log.info(`Service ${name} listening on ${address}:${port}`);
      return listenPort;
    } catch (err) {
      return Promise.reject(err);
    }
  };
}

async function createRouter(routerServiceConfig, { services, log }) {
  try {
    services = services || {};
    log = log || createServiceLogger(routerServiceConfig);
    const router = (0, _Router.Router)({ log });
    const executor = ({ create }) => {
      create.Emitter();
      create.Listener(router.broadcast);
    };
    const { service, startService } = await createService(routerServiceConfig, executor, { log });
    for (let s in services) {
      let config = services[s];
      let { name } = config;
      if (config.uri !== routerServiceConfig.uri) {
        router.addService(name, config);
      }
    }
    router.setRouterService(service);
    return Object.freeze({ router, startService, log });
  } catch (err) {
    return Promise.reject(err);
  }
}

async function bootStrapService(serviceConfig) {
  try {
    const log = createServiceLogger(serviceConfig);
    const setupData = await (0, _dataSource.setup)({ log });
    return Object.assign(setupData, { log, events: _types.events });
  } catch (err) {
    return Promise.reject(err);
  }
}

function getEnabledServices(servicesConfig = {}) {
  let enabled = Object.assign({}, _servicesConfig.servicesNames);
  for (let service in servicesConfig) {
    if (servicesConfig[service] === false) delete enabled[service];
  }
  return enabled;
}
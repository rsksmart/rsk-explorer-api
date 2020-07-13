"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Service = Service;exports.decodeResponse = exports.responseDecoders = exports.clientCredentials = void 0;
var _grpc = _interopRequireDefault(require("grpc"));
var _serviceProto = require("./serviceProto");
var _struct_pb = require("google-protobuf/google/protobuf/struct_pb");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const createCredentials = _grpc.default.ServerCredentials.createInsecure;
const clientCredentials = _grpc.default.credentials.createInsecure;

/**
                                                                     * Service Server
                                                                     * Creates a service
                                                                     * @param {String} uri server URI
                                                                     * @param {Object} [{ name }={}]
                                                                     * @param {Function} executor, expose the 'create' object that contains
                                                                     * the methods to create new services.
                                                                     * @returns {Object}
                                                                     */exports.clientCredentials = clientCredentials;
function Service(uri, options = {}, executor) {
  if (typeof options !== 'object') throw new Error(`Invalid options`);
  const { name } = options;
  const protos = new Set();
  const methods = {};
  const registeredClients = {};
  const server = new _grpc.default.Server();

  const getInfo = () => {
    return { name, protos: [...protos] };
  };

  const addMethods = newMethods => {
    if (typeof newMethods !== 'object') throw new Error(`newMethods must be an object.`);
    for (let name in newMethods) {
      const cb = newMethods[name];
      if (typeof cb !== 'function') {
        throw new Error(`Method ${name}, the method cb must be a function`);
      }
      if (methods[name]) throw new Error(`The method ${name} exists.`);
      methods[name] = cb;
    }
  };

  const getServiceInfo = (call, cb) => {
    const { name, protos } = getInfo();
    const response = new _serviceProto.MESSAGES.InfoResponse();
    response.setName(name);
    response.setProtosList(protos);
    cb(null, response);
  };

  addMethods({
    start: async () => {
      try {
        let port = await new Promise((resolve, reject) => {
          server.bindAsync(uri, createCredentials(), (err, res) => {
            if (err) reject(err);else
            resolve(res);
          });
        });
        if (!port) throw new Error(`Service start error at ${uri}`);
        server.start();
        return port;
      } catch (err) {
        return Promise.reject(err);
      }
    },
    stop: () => {
      server.forceShutdown();
    },
    getServer: () => server,
    getUri: () => uri,
    getInfo });


  // Add service info service
  server.addService(_serviceProto.INFO_SERVICE.service, { getServiceInfo });

  const addService = (serviceName, serviceMethods) => {
    serviceName = `${serviceName}Service`;
    server.addService(_serviceProto.PROTO[serviceName].service, serviceMethods);
    protos.add(serviceName);
  };

  const addClient = (name, value) => {
    if (registeredClients[name]) throw new Error(`The client ${name} exists.`);
    registeredClients[name] = value;
  };

  // EventsEmitterService
  const Emitter = () => {
    const clients = new Map();
    addClient('events', clients);

    const join = call => {
      const peer = call.getPeer();
      call.on('cancelled', () => {
        clients.delete(peer);
      });

      clients.set(peer, call);
    };

    const leave = (call, cb) => {
      const peer = call.getPeer();
      const client = clients.get(peer);
      client.end();
      clients.delete(peer);
      cb(null, new _serviceProto.MESSAGES.Empty());
    };

    const emit = (event, data) => {
      const response = new _serviceProto.MESSAGES.EventResponse();
      response.setEvent(event);
      response.setData(_struct_pb.Struct.fromJavaScript(data));
      clients.forEach(client => client.write(response));
    };

    const getJoined = () => {
      return [...clients.keys()];
    };

    addMethods({ emit, getJoined });
    addService('EventEmitter', { join, leave });
  };

  // EventListenerService
  const Listener = eventHandler => {
    if (typeof eventHandler !== 'function') throw new Error(`eventHandler must be a function.`);
    const send = (call, cb) => {
      const { request } = call;
      const event = request.getEvent().toString();
      const data = request.getData().toJavaScript();
      eventHandler(event, data, call);
      cb(null, new _serviceProto.MESSAGES.Empty());
    };
    addService('EventListener', { send });
  };

  // WorkerService
  const Worker = actions => {
    if (typeof actions !== 'object') throw new Error(`Actions must be an object.`);
    if (Object.keys(actions) < 1) throw new Error('Actions is empty.');
    const run = async (call, cb) => {
      try {
        let { request } = call;
        let action = request.getAction();
        let args = request.getArgsList();
        args = args || [];
        if (!actions[action]) cb(new Error(`Unknown action:${action}`));
        if (!Array.isArray(args)) args = [args];
        let result = await actions[action](...args);
        let response = new _serviceProto.MESSAGES.WorkerResponse();
        result = _struct_pb.Struct.fromJavaScript({ result });
        response.setResult(result);
        cb(null, response);
      } catch (err) {
        cb(err);
        return Promise.reject(err);
      }
    };
    addService('Worker', { run });
  };

  if (typeof executor === 'function') {
    executor({ create: { Emitter, Listener, Worker } });
  }

  return Object.freeze(methods);
}

const responseDecoders = {

  getServiceInfo: response => {
    let { name: serviceName, protosList: protos } = response.toObject();
    return { serviceName, protos };
  },
  join: response => {
    response.on('data', res => {
      let event = res.getEvent();
      let data = res.getData();
      data = data.toJavaScript();
      response.emit('newEvent', { event, data });
    });
    return response;
  },
  leave: response => {},
  send: response => {},
  run: response => {
    let result = response.getResult();
    result = result.toJavaScript();
    return result;
  } };exports.responseDecoders = responseDecoders;


const decodeResponse = (method, response, client) => {
  let decoder = responseDecoders[method];
  if (!decoder) throw new Error(`Unknown method ${method}`);
  return decoder(response, client);
};exports.decodeResponse = decodeResponse;
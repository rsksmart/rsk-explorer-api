"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.Client = Client;
var _serviceProto = require("./serviceProto");
var _ServiceServer = require("./ServiceServer");
var _struct_pb = require("google-protobuf/google/protobuf/struct_pb");

const clientRequest = (client, method) => {
  return function () {
    let args = [...arguments];
    const Request = client[method].requestType;
    const request = new Request([...args]);
    const response = client[method](request);
    return (0, _ServiceServer.decodeResponse)(method, response, client);
  };
};

const clientMethodToPromise = (client, method) => {
  return function () {
    let args = [...arguments];
    const Request = client[method].requestType;
    return new Promise((resolve, reject) => {
      args = args.map(a => {
        if (typeof a === 'object' && !Array.isArray(a)) return _struct_pb.Struct.fromJavaScript(a);
        return a;
      });
      const request = new Request([...args]);
      let obj = Object.entries(request.toObject());
      for (let k in obj) {
        let [field, value] = obj[k];
        if (value === undefined && typeof args[k] === 'object') {
          let n = `set${field.charAt(0).toUpperCase()}${field.slice(1)}`;
          if (typeof request[n] === 'function') {
            request[n](args[k]);
          }
        }
      }
      client[method](request, (err, res) => {
        if (err) reject(err);else
        {
          try {
            let decoded = (0, _ServiceServer.decodeResponse)(method, res);
            resolve(decoded);
          } catch (err) {
            reject(err);
          }
        }
      });
    });
  };
};

/**
    * Service Client
    * @param {String} uri
    * @param {*} credentials
    * @returns
    */

async function Client(uri, credentials) {
  credentials = credentials || (0, _ServiceServer.clientCredentials)();
  try {
    // Get service info
    const infoClient = new _serviceProto.INFO_SERVICE(uri, credentials);
    const { serviceName, protos } = await clientMethodToPromise(infoClient, 'getServiceInfo')();
    // Generate client proto
    const clientServiceName = '__GeneratedClientService';
    const clientProtoDefinition = (0, _serviceProto.joinProtos)(clientServiceName, protos);
    const clientProto = (0, _serviceProto.getProto)(clientProtoDefinition);
    const serviceClient = new clientProto[clientServiceName](uri, credentials);

    // get unary methods
    const clientMethods = Object.entries(clientProtoDefinition[clientServiceName]).
    reduce((v, a) => {
      let [method, def] = a;
      if (def.requestType) v[method] = def;
      return v;
    }, {});

    // Proxy client to promisify unary methods
    const client = new Proxy(serviceClient, {
      get: (obj, prop) => {
        let def = clientMethods[prop];
        if (def) {
          if (def.responseStream === false) return clientMethodToPromise(obj, prop);else
          return clientRequest(obj, prop);
        }

        return obj[prop];
      } });

    return Object.freeze({ serviceName, client });
  } catch (err) {
    return Promise.reject(err);
  }
}
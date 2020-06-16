// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var services_pb = require('./services_pb.js');
var google_protobuf_struct_pb = require('google-protobuf/google/protobuf/struct_pb.js');

function serialize_Empty(arg) {
  if (!(arg instanceof services_pb.Empty)) {
    throw new Error('Expected argument of type Empty');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_Empty(buffer_arg) {
  return services_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_EventRequest(arg) {
  if (!(arg instanceof services_pb.EventRequest)) {
    throw new Error('Expected argument of type EventRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_EventRequest(buffer_arg) {
  return services_pb.EventRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_EventResponse(arg) {
  if (!(arg instanceof services_pb.EventResponse)) {
    throw new Error('Expected argument of type EventResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_EventResponse(buffer_arg) {
  return services_pb.EventResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_InfoRequest(arg) {
  if (!(arg instanceof services_pb.InfoRequest)) {
    throw new Error('Expected argument of type InfoRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_InfoRequest(buffer_arg) {
  return services_pb.InfoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_InfoResponse(arg) {
  if (!(arg instanceof services_pb.InfoResponse)) {
    throw new Error('Expected argument of type InfoResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_InfoResponse(buffer_arg) {
  return services_pb.InfoResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_JoinRequest(arg) {
  if (!(arg instanceof services_pb.JoinRequest)) {
    throw new Error('Expected argument of type JoinRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_JoinRequest(buffer_arg) {
  return services_pb.JoinRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_WorkerRequest(arg) {
  if (!(arg instanceof services_pb.WorkerRequest)) {
    throw new Error('Expected argument of type WorkerRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_WorkerRequest(buffer_arg) {
  return services_pb.WorkerRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_WorkerResponse(arg) {
  if (!(arg instanceof services_pb.WorkerResponse)) {
    throw new Error('Expected argument of type WorkerResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_WorkerResponse(buffer_arg) {
  return services_pb.WorkerResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var InfoService = exports.InfoService = {
  getServiceInfo: {
    path: '/Info/getServiceInfo',
    requestStream: false,
    responseStream: false,
    requestType: services_pb.InfoRequest,
    responseType: services_pb.InfoResponse,
    requestSerialize: serialize_InfoRequest,
    requestDeserialize: deserialize_InfoRequest,
    responseSerialize: serialize_InfoResponse,
    responseDeserialize: deserialize_InfoResponse,
  },
};

exports.InfoClient = grpc.makeGenericClientConstructor(InfoService);
var EventEmitterService = exports.EventEmitterService = {
  join: {
    path: '/EventEmitter/join',
    requestStream: false,
    responseStream: true,
    requestType: services_pb.JoinRequest,
    responseType: services_pb.EventResponse,
    requestSerialize: serialize_JoinRequest,
    requestDeserialize: deserialize_JoinRequest,
    responseSerialize: serialize_EventResponse,
    responseDeserialize: deserialize_EventResponse,
  },
  leave: {
    path: '/EventEmitter/leave',
    requestStream: false,
    responseStream: false,
    requestType: services_pb.Empty,
    responseType: services_pb.Empty,
    requestSerialize: serialize_Empty,
    requestDeserialize: deserialize_Empty,
    responseSerialize: serialize_Empty,
    responseDeserialize: deserialize_Empty,
  },
};

exports.EventEmitterClient = grpc.makeGenericClientConstructor(EventEmitterService);
var EventListenerService = exports.EventListenerService = {
  send: {
    path: '/EventListener/send',
    requestStream: false,
    responseStream: false,
    requestType: services_pb.EventRequest,
    responseType: services_pb.Empty,
    requestSerialize: serialize_EventRequest,
    requestDeserialize: deserialize_EventRequest,
    responseSerialize: serialize_Empty,
    responseDeserialize: deserialize_Empty,
  },
};

exports.EventListenerClient = grpc.makeGenericClientConstructor(EventListenerService);
var WorkerService = exports.WorkerService = {
  run: {
    path: '/Worker/run',
    requestStream: false,
    responseStream: false,
    requestType: services_pb.WorkerRequest,
    responseType: services_pb.WorkerResponse,
    requestSerialize: serialize_WorkerRequest,
    requestDeserialize: deserialize_WorkerRequest,
    responseSerialize: serialize_WorkerResponse,
    responseDeserialize: deserialize_WorkerResponse,
  },
};

exports.WorkerClient = grpc.makeGenericClientConstructor(WorkerService);

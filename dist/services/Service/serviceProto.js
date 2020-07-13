"use strict";Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, "Struct", { enumerable: true, get: function () {return _struct_pb.Struct;} });exports.joinProtos = exports.INFO_SERVICE = exports.PROTO = exports.PROTO_DEFINITION = exports.getProto = exports.MESSAGES = void 0;
var _grpc = _interopRequireDefault(require("grpc"));
var _services_grpc_pb = _interopRequireDefault(require("./protos/services_grpc_pb"));
var _services_pb = _interopRequireDefault(require("./protos/services_pb"));
var _struct_pb = require("google-protobuf/google/protobuf/struct_pb");function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const MESSAGES = _services_pb.default;exports.MESSAGES = MESSAGES;

const getProto = protoDefinition => _grpc.default.loadPackageDefinition(protoDefinition);exports.getProto = getProto;

const PROTO_DEFINITION = _services_grpc_pb.default;exports.PROTO_DEFINITION = PROTO_DEFINITION;

const PROTO = getProto(PROTO_DEFINITION);exports.PROTO = PROTO;

const INFO_SERVICE = PROTO.InfoService;exports.INFO_SERVICE = INFO_SERVICE;

const joinProtos = (name, protos) => {
  let res = {};
  for (let name of protos) {
    let def = PROTO_DEFINITION[name];
    res = Object.assign(res, def);
  }
  let newProto = Object.assign({}, PROTO_DEFINITION);
  newProto[name] = res;
  return newProto;
};exports.joinProtos = joinProtos;

import gRPC from 'grpc'
import services from './protos/services_grpc_pb'
import messages from './protos/services_pb'
export { Struct } from 'google-protobuf/google/protobuf/struct_pb'

export const MESSAGES = messages

export const getProto = protoDefinition => gRPC.loadPackageDefinition(protoDefinition)

export const PROTO_DEFINITION = services

export const PROTO = getProto(PROTO_DEFINITION)

export const INFO_SERVICE = PROTO.InfoService

export const joinProtos = (name, protos) => {
  let res = {}
  for (let name of protos) {
    let def = PROTO_DEFINITION[name]
    res = Object.assign(res, def)
  }
  let newProto = Object.assign({}, PROTO_DEFINITION)
  newProto[name] = res
  return newProto
}

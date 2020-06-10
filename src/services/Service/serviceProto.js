
import gRPC from 'grpc'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'

const PROTO_PATH = path.resolve(__dirname, 'services.proto')

const PROTO_LOADER_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
}

export const loadProtoDefinition = protoPath => protoLoader.loadSync(protoPath, PROTO_LOADER_OPTIONS)

export const getProto = protoDefinition => gRPC.loadPackageDefinition(protoDefinition)

export const PROTO_DEFINITION = loadProtoDefinition(PROTO_PATH)

export const PROTO = getProto(PROTO_DEFINITION)

export const INFO_SERVICE = PROTO.Info

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

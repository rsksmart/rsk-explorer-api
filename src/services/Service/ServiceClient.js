
import { INFO_SERVICE, getProto, joinProtos } from './serviceProto'
import { clientCredentials } from './ServiceServer'

const clientMethodToPromise = (client, method) => {
  return function () {
    const args = [...arguments]
    return new Promise((resolve, reject) => {
      client[method](...args, (err, res) => {
        if (!err) resolve(res)
        return reject(err)
      })
    })
  }
}

/**
 * Service Client
 * @param {String} uri
 * @param {*} credentials
 * @returns
 */

export async function Client (uri, credentials) {
  credentials = credentials || clientCredentials()
  try {
    let serviceName
    // Get service info
    const infoClient = new INFO_SERVICE(uri, credentials)
    const { protos, name } = await clientMethodToPromise(infoClient, 'getServiceInfo')(null)
    serviceName = name

    // Generate client proto
    const clientServiceName = '__GeneratedClientService'
    const clientProtoDefinition = joinProtos(clientServiceName, protos)
    const clientProto = getProto(clientProtoDefinition)
    const serviceClient = new clientProto[clientServiceName](uri, credentials)

    // get unary methods
    const unaryMethods = Object.entries(clientProtoDefinition[clientServiceName])
      .filter(([name, d]) => d.responseStream === false)
      .map(([name]) => name)

    // Proxy client to promisify unary methods
    const client = new Proxy(serviceClient, {
      get: (obj, prop) => {
        if (unaryMethods.includes(prop)) {
          return clientMethodToPromise(obj, prop)
        }
        return obj[prop]
      }
    })
    return Object.freeze({ serviceName, client })
  } catch (err) {
    return Promise.reject(err)
  }
}

import Web3 from 'web3'
import config from '../lib/config'
const node = config.source.node
const port = config.source.port

export const web3Connect = (node, port) => {
  return new Web3(
    new Web3.providers.HttpProvider(
      'http://' + node + ':' + port
    )
  )
}

export const web3 = web3Connect(node, port)

export default web3

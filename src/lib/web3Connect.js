import Web3 from 'web3'

export default function web3Connect (node, port) {
  return new Web3(
    new Web3.providers.HttpProvider(
      'http://' + node + ':' + port
    )
  )
}
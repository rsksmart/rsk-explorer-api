import Web3 from 'web3'
import config from './config'
const url = config.source.url

export const web3Connect = (url) => {
  return new Web3(
    new Web3.providers.HttpProvider(url)
  )
}

export const web3 = web3Connect(url)

export default web3

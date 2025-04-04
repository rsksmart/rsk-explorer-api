import Nod3 from '@rsksmart/nod3'
import { config, PUBLIC_NODE_PROVIDERS } from './config'

/**
 * Creates an RSK node provider instance for the given network
 * @param {string} network - The network type to connect to
 * @param {string} customUrl - Optional custom URL for the node provider
 * @returns {Nod3} A new RSK node provider instance
 */
export const createRskNodeProvider = (network, customUrl) => {
  if (!Object.keys(PUBLIC_NODE_PROVIDERS).includes(network)) {
    throw new Error("Network must be either 'mainnet' or 'testnet'")
  }

  // Use custom URL if provided, otherwise use default
  const url = customUrl || PUBLIC_NODE_PROVIDERS[network].url
  const provider = new Nod3.providers.HttpProvider(url)

  return new Nod3(provider)
}

/**
 * Default RSK node instance using the network and custom URL from the config
 */
export const rskNode = createRskNodeProvider(config.network, config.rskNodeProviderUrl)

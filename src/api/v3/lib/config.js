import dotenv from 'dotenv'

dotenv.config()

export const NETWORK_TYPES = {
  MAINNET: 'mainnet',
  TESTNET: 'testnet'
}

export const PUBLIC_NODE_PROVIDERS = {
  [NETWORK_TYPES.MAINNET]: {
    url: 'https://public-node.rsk.co',
    id: '30'
  },
  [NETWORK_TYPES.TESTNET]: {
    url: 'https://public-node.testnet.rsk.co',
    id: '31'
  }
}

// Validations
if (!process.env.RSK_NODE_PROVIDER_URL) {
  throw new Error('RSK_NODE_PROVIDER_URL is not set')
}

if (!process.env.NETWORK) {
  throw new Error('NETWORK is not set')
}

if (!process.env.RBTC_PRICE_FEEDER_URL) {
  throw new Error('RBTC_PRICE_FEEDER_URL is not set')
}

export const config = {
  rskNodeProviderUrl: process.env.RSK_NODE_PROVIDER_URL,
  network: process.env.NETWORK,
  priceFeeders: {
    RBTC: {
      url: process.env.RBTC_PRICE_FEEDER_URL
    }
  },
  stargate: {
    minAssetsValueThresholdInUSDT: 50
  }
}

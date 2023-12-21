const endpoints = {
  getBlock: ({ hashOrNumber, hash, number }) => {
    return `/api?module=blocks&action=getBlock${hashOrNumber ? `&hashOrNumber=${hashOrNumber}` : hash ? `&hash=${hash}` : `&number=${number}`}`
  },
  getBlocks: ({ miner, addMetadata } = {}) => {
    return `/api?module=blocks&action=getBlocks${miner ? `&miner=${miner}` : addMetadata ? `&addMetadata=${addMetadata}` : ''}`
  }}

const fixtures = {
  testnet: {
    blockHashesforGetBlockEndpoint: [
      '0x1eff0ba70683ad9fab195830fb1f9a7f82d87c0aed0ea04030455ae2811a63d4',
      '0x129b8c08bd4c0d38cda05dc55c248bd61b9362a28fda5113e4d31e1320b8dce1',
      '0x5d1ada33eee92d4d09315ae78833bbac8bffa289f6a6237cb9fd588d04533bfd'
    ],
    blockNumbersForGetBlockEndpoint: [
      3000006,
      4177349,
      4100003
    ],
    minersForGetBlocksEndpoint: [
      '0xb774aa2876145b2f6f3de27e5e6ac970aa12d771',
      '0x1fab9a0e24ffc209b01faa5a61ad4366982d0b7f',
      '0xad418c1d48780005f6d847ef0a5e3bd93ea09090'
    ]
  },
  mainnet: {}
}

export {
  endpoints,
  fixtures
}

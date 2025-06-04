import { bridge } from '@rsksmart/rsk-precompiled-abis'

export const Bridge = {
  address: '0x0000000000000000000000000000000001000006',
  blockNumber: 7351440, // LOVELL
  deployedCode: undefined,
  dbData: {
    address: '0x0000000000000000000000000000000001000006',
    type: 'contract',
    name: 'bridge',
    isNative: true,
    balance: '0x115e51ba54927496afdfac',
    blockNumber: 7351440
  },
  initConfig: {
    id: 'explorerInitialConfig',
    nativeContracts: {
      bridge: '0x0000000000000000000000000000000001000006',
      remasc: '0x0000000000000000000000000000000001000008'
    },
    net: { id: '30', name: 'RSK Mainnet' }
  },
  block: {
    number: 7351440,
    hash: '0xb8210fe01f8b7886af18436feac2989092cb7655303bc3d8857e71ba16662945',
    parentHash: '0x507862842afd6d360fce99660c4d0f5e1214313ee518bdac6bfddc27ff35a34e',
    sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
    logsBloom: '0x00000000000000000000000000000008000000000000000000000000000000000200000000008000000000000000002000000000000000000008000000000000000000000080000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000100020000000000000000000000000000002001000000000000000100001000000000000000000000080000020000000000000200000100000000000000000000000000000000080100800000000000000000000000000000000',
    transactionsRoot: '0x9f73f12b10c7e2ec576b4db6187fe71bc131864e0f0c8bd439912a253c797738',
    stateRoot: '0xddfd18c860dfb87b3ace0ad77641347791f2d0acfbb5cc78d5f9a3237ba3f005',
    receiptsRoot: '0xc0dad3bf4f360e02b0004a801474580d8b87aa881d4fdb18852bdea145224d54',
    miner: '0x93293a100338f54242f05652e137a52e0acdccf0',
    difficulty: '0x236e2d35bcae88e4004',
    totalDifficulty: '0x58d173e12ee44ec72828a36a',
    extraData: '0xd0018e4c4f56454c4c2d62313166393264',
    size: 1340,
    gasLimit: 6800000,
    gasUsed: 69072,
    timestamp: 1742221274,
    transactions: [
      '0x039c8d58884daaa1605d51a62e7a2f22d792e9a7f709effebb4a4edbd92e12c5',
      '0x210a3d6450f77a6b90d1cfb680f630a7e47c61b69df0fbcfbdb56ec5e2243a30'
    ],
    uncles: [],
    minimumGasPrice: '0x1699280',
    bitcoinMergedMiningHeader: '0x00e0ff27cd907e3add977b57a20fe384b77e225fbc5b4e5b3a96010000000000000000005294c08d8f43519ad74dcc49c37fe251539c570c9f930811a14d49f5d437301be02fd8678182021779b4fabc',
    bitcoinMergedMiningCoinbaseTransaction: '0x0000000000000080a41a1b99fe1b34848da7deb65b5d619ffa9d2a773c31a050e6e7cbaab7651373000000ffffffff04a287e112000000001976a914fb37342f6275b13936799def06f2eb4c0f20151588ac00000000000000002b6a2952534b424c4f434b3af3f952800b326e70787ec6c333cca75bbc10297418f0b02789e4171600702c900000000000000000146a124558534154011508000113021b1a1f1200130000000000000000266a24aa21a9ed13103b6b01c3b6804337ee12ae04ea862fa0952afb56a9a0a057ef6533d61a3900000000',
    bitcoinMergedMiningMerkleProof: '0xa69c7c30c8277bba078dc0c8945bca7ae1b02c2e0d0f2795cccafa69db302f434d463ea74eacdf9c7da1742b898ccf0073fb0e2ad7a71a760e9891c9c522b2ae7ee8e19767817cec180a1449642569c0f6454da112dd2fa58419f5480ff952902f7e2096a214e7ff8f5c1713ce7d4fc1a3e4bfcd9e64e34f2f1f7a82ea4a864e7274ce1a03ae381e3b7937248742f144502afae499997bb9edd8df03b6e6e435ee16a3f24a2cd90fe3a1b3c3a29f182d096a17d78539e685276579ab2dd15d8f965a3aac640d9cc7fbf1745ef9957b07cbff6b6fbe6f72ac3d86cce57a65ba96d9991ebe49104bbfcc39468dc7607f1868d06cc90a2478419e01241923ac79dbad1eec6870badaf831a80812dcd26b1dbc826cd9d3f16eb9eff77dbe1155f81a1175d742e52b76f25e58352eda630bce4ec3a797130996de617dd79e2012e0b25dfe7ba6ae8606257dd4b20e24737332df3059f23d088630fb85fb17884a0e56e26cf354f35352e666ea220e079d13987bb598a01e4435de1649f854659ad000',
    hashForMergedMining: '0xf3f952800b326e70787ec6c333cca75bbc10297418f0b02789e4171600702c90',
    paidFees: '0x1a330637c00',
    cumulativeDifficulty: '0x236e2d35bcae88e4004',
    rskPteEdges: null,
    _received: 1742229991002
  },
  expectedInitialState: {
    address: '0x0000000000000000000000000000000001000006',
    type: 'contract',
    isNative: true,
    balance: '0x115e51ba54927496afdfac',
    blockNumber: 7351440,
    contractMethods: [],
    contractInterfaces: [],
    name: 'bridge',
    symbol: null,
    decimals: null,
    totalSupply: null
  },
  expectedStateAfterFetch: {
    address: '0x0000000000000000000000000000000001000006',
    type: 'contract',
    isNative: true,
    balance: '0x115e51ba54927496afdfac',
    blockNumber: 7351440,
    contractMethods: [],
    contractInterfaces: [],
    name: 'bridge',
    symbol: null,
    decimals: null,
    totalSupply: null
  },
  expectedVerifiedInitialState: {
    address: '0x0000000000000000000000000000000001000006',
    type: 'contract',
    isNative: true,
    balance: '0x115e51ba54927496afdfac',
    blockNumber: 7351440,
    contractMethods: [],
    contractInterfaces: [],
    name: 'bridge',
    symbol: null,
    decimals: null,
    totalSupply: null
  },
  expectedVerifiedStateAfterFetch: {
    address: '0x0000000000000000000000000000000001000006',
    type: 'contract',
    isNative: true,
    balance: '0x115e51ba54927496afdfac',
    blockNumber: 7351440,
    contractMethods: [],
    contractInterfaces: [],
    name: 'bridge',
    symbol: null,
    decimals: null,
    totalSupply: null
  },
  name: 'Bridge',
  network: 'mainnet',
  abi: bridge.abi
}

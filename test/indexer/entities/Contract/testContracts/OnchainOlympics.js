const expectedInitialState = {
  address: '0xb8ef8a681c00d41cc0ca6e64b7415b020a6a206a',
  type: 'contract',
  isNative: false,
  balance: '0x0',
  blockNumber: 9000000,
  contractInterfaces: [],
  contractMethods: [],
  name: null,
  symbol: null,
  decimals: null,
  totalSupply: null,
  code: '0x363d3d373d3d3d363d7354c97c29021a12cacb31f8388b32dd5486083f7b5af43d82803e903d91602b57fd5bf3',
  codeStoredAtBlock: 9000000,
  deployedCode: '0x363d3d373d3d3d363d7354c97c29021a12cacb31f8388b32dd5486083f7b5af43d82803e903d91602b57fd5bf3'
}

const expectedStateAfterFetch = {
  address: '0xb8ef8a681c00d41cc0ca6e64b7415b020a6a206a',
  type: 'contract',
  isNative: false,
  balance: '0x0',
  blockNumber: 9000000,
  contractInterfaces: [ 'ERC1167', 'ERC165', 'ERC1155', 'ERC1155MetadataURI' ],
  contractMethods: [
    'name()',
    'symbol()',
    'transfer(address,uint256)',
    'transferFrom(address,address,uint256)',
    'owner()',
    'supportsInterface(bytes4)',
    'isApprovedForAll(address,address)',
    'setApprovalForAll(address,bool)',
    'balanceOf(address,uint256)',
    'balanceOfBatch(address[],uint256[])',
    'safeTransferFrom(address,address,uint256,uint256,bytes)',
    'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
    'uri(uint256)'
  ],
  name: 'thirdweb Onchain Olympics - Rootstock',
  symbol: 'ONCHAINOLYMPICS',
  decimals: null,
  totalSupply: null,
  code: '0x363d3d373d3d3d363d7354c97c29021a12cacb31f8388b32dd5486083f7b5af43d82803e903d91602b57fd5bf3',
  codeStoredAtBlock: 9000000,
  deployedCode: '0x363d3d373d3d3d363d7354c97c29021a12cacb31f8388b32dd5486083f7b5af43d82803e903d91602b57fd5bf3'
}

export const OnchainOlympics = {
  address: '0xb8ef8a681c00d41cc0ca6e64b7415b020a6a206a',
  blockNumber: 9000000,
  deployedCode: '0x363d3d373d3d3d363d7354c97c29021a12cacb31f8388b32dd5486083f7b5af43d82803e903d91602b57fd5bf3',
  dbData: {
    address: '0xb8ef8a681c00d41cc0ca6e64b7415b020a6a206a',
    type: 'contract',
    isNative: false,
    balance: '0x0',
    blockNumber: 9000000,
    code: '0x363d3d373d3d3d363d7354c97c29021a12cacb31f8388b32dd5486083f7b5af43d82803e903d91602b57fd5bf3',
    codeStoredAtBlock: 9000000,
    deployedCode: '0x363d3d373d3d3d363d7354c97c29021a12cacb31f8388b32dd5486083f7b5af43d82803e903d91602b57fd5bf3'
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
    number: 9000000,
    hash: '0x8504f9b1d5adb7dbd560165fdabc089c9f680831b68175ef300292559fe9c9cb',
    parentHash: '0xff069ccbe7bc135ad4c0207e1680266367f8e40d7f0ae3fab6bbb2826e5bba03',
    mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    nonce: '0x0000000000000000',
    sha3Uncles: '0x7c8843a7255e65eed7190117290c7eb135a2ad5df23c479ec6ee8df90c654678',
    logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000020400000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100020000000000000000000000000000000001000020000000000000001000000000000000000000000000020000000000000200000100000000000000000000000000000000080000000000000000000000000000000000000',
    transactionsRoot: '0xb3e250f3d86e003d47d5ed383241792a80b146a8b3ed42e3def63b7920a1ef40',
    stateRoot: '0xc0ba602f2c121264f8948a429a12cfdb2ce7025cfd699b4f602e042a751b86c8',
    receiptsRoot: '0x5cea588183263b0e932a3fcdfbf41932fde24ab57b25cfc21c9c48e832daebdc',
    miner: '0x4e5dabc28e4a0f5e5b19fcb56b28c5a1989352c1',
    difficulty: '0x193e868631d88e7bc41',
    totalDifficulty: '0xb96d8d427b3a18618a1b8f75',
    extraData: '0xd1018f564554495645522d35386361666130',
    size: 2353,
    gasLimit: 10000000,
    gasUsed: 0,
    timestamp: 1782788355,
    transactions: [ '0x00466354fd798f3ce630633c2d7cf7afeac016ee6f74f3a6450dc7058b242e8a' ],
    uncles: [ '0x2d2f4c256e637eadf668911d4e1b58857908380f0e5bc31a04679e7c3f31e719' ],
    minimumGasPrice: '0x1699280',
    bitcoinMergedMiningHeader: '0x00e00e2072331b0b59ce8282b7d8d9cf2bf9831b8871df580e560000000000000000000070600e8b1d2aa734158bbb402be6e2a795edae9ad99b027305a072f8da29e1300631436a421a0217b510ebc2',
    bitcoinMergedMiningCoinbaseTransaction: '0x0000000000000180917b15f38898e3a7950592c797d3456a317c61e9eb2e1c92c9ed7ecce4b92eca00000000002b6a2952534b424c4f434b3a4708c272688614cf07742770db899f2bc2aa68b84212f309391c3b0b0089544000000000',
    bitcoinMergedMiningMerkleProof: '0x567ee3f732d0aaef34a3efe2ae490ab2ab953c42adbe779c6651ce34c87c00c7aaadd78cb9ea96dc696ec1eb920eedf6c02ac8e952bff72b29459bc2c71aa771e4ba94c4455521e42676442717c6e58e141843e590f398d4d563b5b5d8c959d8335f4c70ac70d5ce7a09d378c974eee19c9c0112fa7add64cfeb0fdb9301361f2595c87924ae725164def351e9e2820046f3ffedf9800500325654a0bbca7fd544c828e3224fd38f81627a2c644bd1abc15249d075d50dff8b2756e005649f877ce666cb2b4622667a9496529f2e83b84015ffe7b1861206553b59f686f27d81efd7c0519d004cfc7c3dd6a9356fdaa681c0bedb52c8c067f00a5d7d662181e442f52d4f72d4cd40a338b3f533dbd110a96906443d4a7045d5317b79cdc981515d65f7c8fb7ddf614f9e3685e28f1e01e081ee4344aac7b155c436d88b4d49a03cfd9518d30bf0a54617edf2d2b52b893f56587cdbdd6ad7b1dd6c68d63b6a58148d370c621e4d4ffa2c96e24f0e707fb45c2baf9b81fbccbf645aedaa573ff52fb482cc9f0db212bea34fc6cb794d8be886fb2be9e333ee381f2819ab5bd35a',
    hashForMergedMining: '0x4708c272688614cf07742770db899f2bc2aa68b84212f309391c3b0b00895440',
    paidFees: '0x0',
    cumulativeDifficulty: '0x325cdbeecd3e554ebc2',
    rskPteEdges: null,
    baseEvent: null
  },
  expectedInitialState,
  expectedStateAfterFetch,
  expectedVerifiedInitialState: expectedInitialState,
  expectedVerifiedStateAfterFetch: expectedStateAfterFetch,
  name: 'OnchainOlympics',
  network: 'mainnet'
}

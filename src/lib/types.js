import { apiErrors } from '../lib/errors'

export const txTypes = {
  default: 'normal',
  remasc: 'remasc',
  bridge: 'bridge',
  contract: 'contract deploy',
  call: 'contract call'
}

export const errors = apiErrors(
  {
    INVALID_REQUEST: 'Invalid Request',
    INVALID_TYPE: 'Invalid Type',
    EMPTY_RESULT: 'Not Found',
    TEMPORARILY_UNAVAILABLE: 'Service temporarily unavailable',
    UPDATING_REGISTRY: 'Updating registry'
  }
)

export const addrTypes = {
  ADDRESS: 'account',
  CONTRACT: 'contract'
}

export const contractsInterfaces = {
  ERC20: 'ERC20',
  ERC677: 'ERC677',
  ERC165: 'ERC165',
  ERC721: 'ERC721'
}

const ci = contractsInterfaces

export const tokensInterfaces = [
  ci.ERC20,
  ci.ERC677,
  ci.ERC721
]

export const events = {
  'BLOCK_QUEUED': 'blockQueued',
  'BLOCK_REQUESTED': 'blockRequested',
  'NEW_BLOCK': 'newBlock',
  'BLOCK_ERROR': 'blockError',
  'QUEUE_DONE': 'queueDone'
}

export const actions = {
  'BULK_BLOCKS_REQUEST': 'bulkRequest',
  'BLOCK_REQUEST': 'requestBlock',
  'STATUS_UPDATE': 'updateStatus',
  'CHECK_DB': 'checkDB',
  'CHECK_TIP': 'checkBcTip',
  'UPDATE_TIP_BLOCK': 'updateTipBlock'
}

export const MODULES = {
  blocks: 'Block',
  transactions: 'Tx',
  addresses: 'Address',
  events: 'Event',
  tokens: 'Token',
  stats: 'Stats',
  summary: 'Summary',
  txPending: 'TxPending',
  extendedStats: 'ExtendedStats',
  contractVerifier: 'ContractVerification'
}

export const BIG_NUMBER = 'BigNumber'

export const OBJECT_ID = 'ObjectID'

export const TOTAL_SUPPLY = 21 * 10 ** 6

export const fields = {
  LAST_BLOCK_MINED: 'lastBlockMined'
}

export const EVMversions = [
  'homestead',
  'tangerineWhistle',
  'spuriousDragon',
  'byzantium',
  'constantinople',
  'petersburg']

export const bitcoinNetworks = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet'
}

export const bitcoinRskNetWorks = {
  31: bitcoinNetworks.TESTNET,
  30: bitcoinNetworks.MAINNET
}

export default { txTypes, errors, addrTypes, contractsInterfaces }

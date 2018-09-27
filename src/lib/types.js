import { apiErrors } from '../lib/errors'

export const txTypes = {
  default: 'normal',
  remasc: 'remasc',
  bridge: 'bridge',
  contract: 'contract deploy'
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

export const contractsTypes = {
  ERC20: 'ERC20'
}

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

export const BIG_NUMBER = 'BigNumber'

export default { txTypes, errors, addrTypes, contractsTypes }

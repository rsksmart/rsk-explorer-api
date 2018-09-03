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
    TEMPORARILY_UNAVAILABLE: 'Service temporarily unavailable'
  }
)

export const addrTypes = {
  ADDRESS: 'account',
  CONTRACT: 'contract'
}

export const contractsTypes = {
  ERC20: 'ERC20'
}

export const BIG_NUMBER = 'BigNumber'

export default { txTypes, errors, addrTypes, contractsTypes }

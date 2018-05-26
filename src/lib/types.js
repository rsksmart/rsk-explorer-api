
export const txTypes = {
  default: 'normal',
  remasc: 'remasc',
  bridge: 'bridge',
  contract: 'contract deploy'
}

export const errors = {
  INVALID_REQUEST: 'Invalid Request',
  INVALID_TYPE: 'Invalid Type',
  EMPTY_RESULT: 'Not Found'
}

export const addrTypes = {
  ADDRESS: 'account',
  CONTRACT: 'contract'
}

export const contractsTypes = {
  ERC20: 'ERC20'
}

export default { txTypes, errors, addrTypes, contractsTypes }

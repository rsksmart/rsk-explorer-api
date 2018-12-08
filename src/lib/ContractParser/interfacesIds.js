import { erc165IdFromMethods } from './lib'

const erc20methods = [
  'totalSupply()',
  'balanceOf(address)',
  'allowance(address,address)',
  'transfer(address,uint256)',
  'approve(address,uint256)',
  'transferFrom(address,address,uint256)'
]

const erc667Methods = erc20methods.concat([
  'transferAndCall(address,uint256,bytes)'
])

export const interfacesIds = {
  ERC20: makeInterface(erc20methods),
  ERC667: makeInterface(erc667Methods),
  ERC165: makeInterface(['supportsInterface(bytes4)'])
}

function makeInterface (methods) {
  let id = erc165IdFromMethods(methods)
  return { methods, id }
}

export default interfacesIds

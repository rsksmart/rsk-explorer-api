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
  ERC165: makeInterface(['supportsInterface(bytes4)']),
  ERC721: makeInterface([
    'balanceOf(address)',
    'ownerOf(uint256)',
    'approve(address,uint256)',
    'getApproved(uint256)',
    'setApprovalForAll(address,bool)',
    'isApprovedForAll(address,address)',
    'transferFrom(address,address,uint256)',
    'safeTransferFrom(address,address,uint256)',
    'safeTransferFrom(address,address,uint256,bytes)'
  ]),
  ERC721Enumerable: makeInterface([
    'totalSupply()',
    'tokenOfOwnerByIndex(address,uint256)',
    'tokenByIndex(uint256)'
  ]),
  ERC721Metadata: makeInterface([
    'name()',
    'symbol()',
    'tokenURI(uint256)'
  ]),
  ERC721Exists: makeInterface([
    'exists(uint256)'
  ])
}

function makeInterface (methods) {
  let id = erc165IdFromMethods(methods)
  return { methods, id }
}

export default interfacesIds

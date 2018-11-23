import ContractParser from './ContractParser'

const parser = new ContractParser()
let address = '0xbdcc4e8b8fc2a814ea013c14eb8ce9b3bca19067'
let contract = parser.makeContract(address)


parser.implementsErc165(contract).then(res => console.log)

process.on('unhandledRejection', err => {
  console.log(err)
  process.exit()
})

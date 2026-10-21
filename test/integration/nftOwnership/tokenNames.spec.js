import { expect } from 'chai'
import { prismaClient } from '../../../src/lib/prismaClient'
import ContractEventsUpdater from '../../../src/services/classes/ContractEventsUpdater'
import { integrationDescribe, resetDatabase } from './replay'

const UNNAMED = `0x${'a'.repeat(40)}`
const NAMED = `0x${'b'.repeat(40)}`
const tokenData = { name: 'Rootstock Punks', symbol: 'RPUNK', decimals: 0 }

const updater = new ContractEventsUpdater({ prismaClient })
const storedNames = address => prismaClient.contract.findUnique({
  where: { address },
  select: { symbol: true, decimals: true, address_contract_addressToaddress: { select: { name: true } } }
})

async function storeContract (address, { name, symbol, decimals }) {
  await prismaClient.address.create({ data: { address, isNative: false, type: 'contract', name } })
  await prismaClient.contract.create({ data: { address, symbol, decimals } })
}

integrationDescribe('the re-detection writes only the token names a contract is missing', () => {
  beforeEach(async () => {
    await resetDatabase()
    await storeContract(UNNAMED, { name: '', symbol: null, decimals: null })
    await storeContract(NAMED, { name: 'Kept', symbol: 'KEPT', decimals: 18 })
  })

  it('writes every missing field, keeps every existing one, and writes nothing on a second run', async () => {
    const first = await Promise.all([UNNAMED, NAMED].map(address => updater.saveMissingTokenNames(address, tokenData)))
    const second = await Promise.all([UNNAMED, NAMED].map(address => updater.saveMissingTokenNames(address, tokenData)))

    expect(first).to.deep.equal([tokenData, null])
    expect(second).to.deep.equal([null, null])
    expect(await storedNames(UNNAMED)).to.deep.equal({ symbol: 'RPUNK', decimals: 0, address_contract_addressToaddress: { name: 'Rootstock Punks' } })
    expect(await storedNames(NAMED)).to.deep.equal({ symbol: 'KEPT', decimals: 18, address_contract_addressToaddress: { name: 'Kept' } })
  })

  it('writes nothing for a value the contract did not return', async () => {
    const named = await updater.saveMissingTokenNames(UNNAMED, { name: null, symbol: '', decimals: null })

    expect(named).to.equal(null)
    expect(await storedNames(UNNAMED)).to.deep.equal({ symbol: null, decimals: null, address_contract_addressToaddress: { name: '' } })
  })
})

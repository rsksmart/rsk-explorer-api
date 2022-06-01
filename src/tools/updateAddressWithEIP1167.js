import dataSource from '../lib/dataSource.js'
import { ContractParser, Constants } from '../../.yalc/@rsksmart/rsk-contract-parser'

export async function start () {
  const parser = new ContractParser()
  const { collections } = await dataSource()
  const { EIP_1167_PREFIX, EIP_1167_SUFFIX } = Constants
  const proxyRegex = new RegExp(`^(0x)?${EIP_1167_PREFIX}[a-f0-9]{40}${EIP_1167_SUFFIX}$`, 'i')
  const collectionWithProxies = await collections.Addrs.find({ code: proxyRegex }).toArray()

  for (let i = 0; i < collectionWithProxies.length; i++) {
    if (!collectionWithProxies[i].masterCopy && collectionWithProxies[i].code) {
      const updateResult = await collections.Addrs.updateOne({_id: collectionWithProxies[i]._id},
        {$set: {masterCopy: parser.getEip1167MasterCopy(collectionWithProxies[i].code)}})
      console.log('updating id => ', collectionWithProxies[i]._id)
      console.log(updateResult)
    }
  }
  process.exit(0)
}

start()

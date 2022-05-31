import dataSource from '../lib/dataSource.js'
import { ContractParser } from '@rsksmart/rsk-contract-parser'

export async function start () {
  const parser = new ContractParser()
  const { collections } = await dataSource()
  const collectionWithProxies = await collections.Addrs.find({code: { $regex: /^(0x)?363d3d373d3d3d363d73[a-f0-9]{40}5af43d82803e903d91602b57fd5bf3$/, $options: 'i' }}).toArray()
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

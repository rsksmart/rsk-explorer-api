import { prismaClient } from '../lib/prismaClient.js'

async function main () {
  console.log('Getting total blocks...')

  const totalBlocks = await prismaClient.block.count()

  console.log(`Total blocks: ${totalBlocks}`)
}

main()

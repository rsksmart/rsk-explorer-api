import { setupBlocks } from './index.js'

setupBlocks().then(() => {
  process.exit(0)
}).catch(err => {
  console.log(err)
  process.exit(9)
})

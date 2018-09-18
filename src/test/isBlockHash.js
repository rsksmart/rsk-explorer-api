import { isBlockHash } from '../lib/utils'

const cases = [
  0x9af4ce0342826e00540a269f9ae6e6c83cecb18fb9a375a4ff1171e3f1bb803d,
  '0x9af4ce0342826e00540a269f9ae6e6c83cecb18fb9a375a4ff1171e3f1bb803d',
  '9af4ce0342826e00540a269f9ae6e6c83cecb18fb9a375a4ff1171e3f1bb803d',
  '122',
  'test'
]

for (let c of cases) {
  let test = isBlockHash(c)
  console.log(`${c} = ${test}`)
}

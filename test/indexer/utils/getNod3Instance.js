import { nod3Connect } from '../../../src/lib/nod3Connect'

export const getNod3Instance = (network) => {
  if (network === 'mainnet') {
    return nod3Connect('http://localhost:4446')
  }

  return nod3Connect('http://localhost:4444')
}

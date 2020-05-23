import { Nod3, Nod3Hub } from 'nod3'
import config from './config'

const { HttpProvider } = Nod3.providers
const { source } = config

export const nod3Connect = (url, options = {}) => new Nod3(new HttpProvider(url), options)

// return nod3 | nod3Hub based on source
export const nod3BySource = (source, options = {}) => {
  if (Array.isArray(source)) return createNod3Hub(source, options)
  return nod3Instance(source, options)
}

export const createNod3Hub = (sources, options) => {
  const providers = sources.map(({ url }) => new HttpProvider(url))
  return Nod3Hub(providers, options)
}

// Returns always a nod3 instance
export const nod3Instance = (source, options = {}) => {
  const sources = (!Array.isArray(source)) ? [source] : [...source]
  return nod3Connect(sources[0].url, options)
}

export const nod3 = nod3Instance(source)
export const nod3Hub = nod3BySource(source)

export default nod3

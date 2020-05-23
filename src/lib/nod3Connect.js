import { Nod3, Nod3Router } from 'nod3'
import config from './config'

const { HttpProvider } = Nod3.providers
const { source, sourceRoutes } = config

export const nod3Connect = (url, options = {}) => new Nod3(new HttpProvider(url), options)

// return Nod3 | Nod3Router based on source
export const nod3BySource = (source, options = {}, nod3) => {
  if (Array.isArray(source)) return createNod3Router(source, options)
  return nod3 || nod3Instance(source, options)
}

export const createNod3Router = (sources, options = {}) => {
  const providers = sources.map(({ url }) => new HttpProvider(url))
  let { nod3, router } = Nod3Router(providers, options)
  // Add routes
  if (sourceRoutes && typeof sourceRoutes === 'object') {
    for (let module in sourceRoutes) {
      let to = sourceRoutes[module]
      router.add({ module, to })
    }
  }
  return nod3
}

// Returns always a nod3 instance
export const nod3Instance = (source, options = {}) => {
  const sources = (!Array.isArray(source)) ? [source] : [...source]
  return nod3Connect(sources[0].url, options)
}

export const nod3 = nod3Instance(source)
export const nod3Router = nod3BySource(source, {}, nod3)

export default nod3

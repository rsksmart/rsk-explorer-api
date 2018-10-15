import Nod3 from 'nod3'
import config from './config'
const url = config.source.url

export const nod3Connect = (url) => {
  return new Nod3(
    new Nod3.providers.HttpProvider(url)
  )
}

export const nod3 = nod3Connect(url)

export default nod3

import { BcThing } from './BcThing'
import { isBlockHash } from '../../lib/utils'
export class BlockTrace extends BcThing {
  constructor (hash, { nod3, log, initConfig }) {
    if (!isBlockHash(hash)) throw new Error(`Invalid blockHash ${hash}`)
    super({ nod3, log, initConfig })
    this.hash = hash
  }

  async fetchFromNode () {
    const { hash, nod3 } = this
    const blockTrace = await nod3.trace.block(hash)

    return blockTrace
  }
}

export default BlockTrace

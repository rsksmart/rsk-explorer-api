import { Block } from './Block'
import { Tx } from './Tx'
import { Address } from './Address'
import { Event } from './Event'
import { Token } from './Token'
import { TxPending } from './TxPending'
import { Stats } from './Stats'
import { Summary } from './Summary'
// import { ExtendedStats } from './ExtendedStats'
import { VerificationResults } from './VerificationResults'
import { ContractVerification } from './ContractVerification'
import { InternalTx } from './InternalTx'
import { Balances } from './Balances'
import { getModulesNames, getEnabledModules } from '../lib/apiTools'

const apiModules = {
  Blocks: Block,
  Tx,
  Address,
  Event,
  Token,
  TxPending,
  Stats,
  Summary,
  ContractVerification,
  VerificationResults,
  InternalTx,
  Balances
}

export const getEnabledApiModules = modules => {
  const enabled = getModulesNames(getEnabledModules(modules))
  return enabled.reduce((v, a) => {
    v[a] = apiModules[a]
    return v
  }, {})
}

export default apiModules

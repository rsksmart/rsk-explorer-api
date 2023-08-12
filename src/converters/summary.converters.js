import { addressEntityToRaw } from './address.converters'
import { blockEntityToRaw } from './blocks.converters'
import { eventEntityToRaw } from './event.converters'
import { internalTxEntityToRaw } from './internalTx.converters'
import { tokenEntityToRaw } from './token.converters'
import { transactionEntityToRaw } from './tx.converters'

function rawBlockSummaryToEntity ({
  id,
  hash,
  number,
  timestamp
}) {
  return {
    id,
    hash,
    number,
    timestamp
  }
}

function summaryEntityToRaw ({
  id,
  hash,
  number,
  timestamp,
  address_in_summary: addresses,
  block_block_summary_hashToblock: block,
  event_in_summary: events,
  internal_transaction_in_summary: internalTransactions,
  suicide_in_summary: suicides,
  token_address_in_summary: tokenAddresses,
  transaction_in_summary: transactions
}) {
  return {
    id,
    hash,
    number,
    timestamp,
    data: {
      addresses: addresses.map(address => addressEntityToRaw(address.address_address_in_summary_addressToaddress)),
      block: blockEntityToRaw(block),
      events: events.map(event => eventEntityToRaw(event.event)),
      internalTransactions: internalTransactions.map(itx => internalTxEntityToRaw(itx.internal_transaction)),
      suicides: suicides.map(itx => internalTxEntityToRaw(itx.internal_transaction)),
      tokenAddresses: tokenAddresses.map(token => tokenEntityToRaw(token.token_address)),
      transactions: transactions.map(tx => transactionEntityToRaw(tx.transaction))
    }
  }
}

export { rawBlockSummaryToEntity, summaryEntityToRaw }

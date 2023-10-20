import { addressEntityToRaw } from './address.converters'
import { blockEntityToRaw } from './blocks.converters'
import { eventEntityToRaw } from './event.converters'
import { internalTxEntityToRaw } from './internalTx.converters'
import { tokenEntityToRaw } from './token.converters'
import { transactionEntityToRaw } from './tx.converters'

function rawBlockSummaryToEntity ({
  blockNumber,
  hash,
  timestamp
}) {
  return {
    blockNumber,
    hash,
    timestamp
  }
}

function summaryEntityToRaw ({
  blockNumber,
  hash,
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
    blockNumber,
    hash,
    timestamp: Number(timestamp),
    data: {
      addresses: addresses.map(address => {
        // overwrites these 3 attributes saved in address_in_summary table on the address retrieved from the address table through the relation
        address.address_address_in_summary_addressToaddress.balance = address.balance
        address.address_address_in_summary_addressToaddress.blockNumber = address.blockNumber
        address.address_address_in_summary_addressToaddress.block = address.block

        return addressEntityToRaw(address.address_address_in_summary_addressToaddress, { isForSummary: true })
      }),
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

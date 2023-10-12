const blockRelatedTables = {
  uncle: {select: {hash: true}},
  transaction_transaction_block_numberToblock: {select: {hash: true}},
  miner: {select: {address: true}}
}

const addressRelatedTables = ({ forSummary } = {}) => {
  const relations = {
    contract_destruction_tx: { select: { tx: true } },
    contract_contract_addressToaddress: {
      include: {
        contract_creation_tx: { select: {tx: true} },
        total_supply: {select: {totalSupply: true}, orderBy: {blockNumber: 'desc'}, take: 1},
        contract_method: {select: {method: true}},
        contract_interface: {select: {interface: true}}
      }
    }
  }

  if (!forSummary) {
    relations.address_latest_balance_address_latest_balance_addressToaddress = {select: {balance: true, blockNumber: true}}
    relations.address_latest_balance_address_latest_balance_addressToaddress = {select: {balance: true, blockNumber: true}}
    relations.miner_miner_addressToaddress = {select: {block: {include: blockRelatedTables}}, orderBy: {blockNumber: 'desc'}, take: 1}
  }

  return relations
}

const eventRelatedTables = {
  address_in_event: { select: { address: true } }
}

const txRelatedTables = {
  receipt: true
}

const summaryRelatedTables = {
  address_in_summary: {include: {block: {include: blockRelatedTables}, address_address_in_summary_addressToaddress: {include: addressRelatedTables({ forSummary: true })}}},
  block_block_summary_hashToblock: {include: blockRelatedTables},
  event_in_summary: {include: {event: {include: eventRelatedTables}}},
  internal_transaction_in_summary: {include: {internal_transaction: true}},
  suicide_in_summary: {include: {internal_transaction: true}},
  token_address_in_summary: {include: {token_address: true}},
  transaction_in_summary: {include: {transaction: {include: txRelatedTables}}}
}

export {
  addressRelatedTables,
  blockRelatedTables,
  eventRelatedTables,
  summaryRelatedTables,
  txRelatedTables
}

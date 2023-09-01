const blockRelatedTables = {
  uncle: {select: {hash: true}},
  transaction_transaction_block_numberToblock: {select: {hash: true}},
  miner: {select: {address: true}}
}

const addressRelatedTables = {
  miner_miner_addressToaddress: {select: {block: {include: blockRelatedTables}}, orderBy: {blockNumber: 'desc'}, take: 1},
  balance_balance_addressToaddress: {select: {balance: true, blockNumber: true}, orderBy: {blockNumber: 'desc'}, take: 1},
  contract_contract_addressToaddress: {
    include: {
      contract_creation_tx: { select: {tx: true} },
      total_supply: {select: {totalSupply: true}, orderBy: {blockNumber: 'desc'}, take: 1},
      contract_method: {select: {method: true}},
      contract_interface: {select: {interface: true}}
    }
  }
}

const eventRelatedTables = {
  event_arg: {select: {arg: true}},
  event_topic: {select: {topic: true}},
  address_in_event: {select: {address: true}},
  abi: {include: {abi_input: {select: {name: true, type: true, indexed: true}}}}
}

const internalTxRelatedTables = {
  action: true,
  internal_transaction_result: true,
  trace_address: {
    select: {
      trace: true
    },
    orderBy: {
      index: 'asc'
    }
  }
}

const txRelatedTables = {
  receipt: {
    include: {
      log: {
        include: {
          abi_log_abiToabi: {include: {abi_input: {select: {name: true, type: true, indexed: true}}}},
          log_topic: {select: {topic: true}, orderBy: { topicIndex: 'asc' }},
          log_arg: {select: {arg: true}},
          logged_address: {select: {address: true}}
        }
      }
    }
  }
}

const summaryRelatedTables = {
  address_in_summary: {include: {address_address_in_summary_addressToaddress: {include: addressRelatedTables}}},
  block_block_summary_hashToblock: {include: blockRelatedTables},
  event_in_summary: {include: {event: {include: eventRelatedTables}}},
  internal_transaction_in_summary: {include: {internal_transaction: {include: internalTxRelatedTables}}},
  suicide_in_summary: {include: {internal_transaction: {include: internalTxRelatedTables}}},
  token_address_in_summary: {include: {token_address: true}},
  transaction_in_summary: {include: {transaction: {include: txRelatedTables}}}
}

export {
  addressRelatedTables,
  blockRelatedTables,
  eventRelatedTables,
  internalTxRelatedTables,
  summaryRelatedTables,
  txRelatedTables
}

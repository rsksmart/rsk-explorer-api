# Changelog
## [1.1.8] - 2021-01-28
#### Changed

- Dependencies: nod3 to @rsksmart/nod3
- Dependencies: rsk-contract-parser to @rsksmart/rsk-contract-parser
- Replace: lib/cli with @rsksmart/rsk-js-cli

## [1.1.7] - 2021-01-07

### Fixed

- API getVerificationResults
- Stats channel
- Datacollector.getLatest

### Added

- Locking cap to stats

## [1.1.6] - 2020-08-31

### Fixed

- Token totalSupply & decimals serialization

### Added

- Get balances of all addresses obtained by the block summaries for each block number.  

## [1.1.5] - 2020-08-11

### Added

- Self destructed contracts support.
- Tools: updateBalances, checks/updates the balances of all DB addresses.

### Fixed

- Contracts balances

## [1.1.4] - 2020-08-06

### Updated

- Db.createCollection to the new mongodb driver behavior.
- blocks checker service, delay before start.
- Config: disable services in config.

## [1.1.3] - 2020-08-04

This release requires the regeneration of the DB follow the instructions in [UPDATES.md](UPDATES.md) before starting.

### Fixed

- Event decoding.
- Addresses balances.
- Token Addresses balances and detection.
- Repetitive indexing of collections at each service start.
- Tokens total supply, see #30.

## [1.1.2] - 2020-07-17

### Fixed
  
- blocksBalances memory leak

### Updated

- blocksBalances: Store record of requested block balances to skip on next sync.

## [1.1.1] - 2020-07-16

### Changed

- Default config, remove logging to files as default
- blocksBalances service, get balances one by one.

### Added

- Log configuration instructions to README
- config.log.dir as PM2 log folder in blocks.config.js
- api.config.js, PM2 config file to start api

### Fixed

- Unhandled promise rejection on API start

## [1.1.0] - 2020-07-13

### Added

- Internal Transactions
- Address Balances
- Decode events using ABI for verified contracts

## Changed

- Services

## [1.0.8] - 2020-06-02

### Added

- Add 'istanbul' to EVM versions list

### Fixed

- TxPool collection indexes

## [1.0.7] - 2020-04-08

### Fixed

- Include event decoded fields in tx.receipt.logs

## [1.0.6] - 2019-04-03

### Added

- Update the balances of the token accounts, recovered in the previous block, when a new block is saved.

## [1.0.5] - 2020-03-05

### Fixed

- Blocks service: Db error on the first run
- Errors when running against a regtest node

### Changed

- Docker: expose api documentation

## [1.0.4] - 2020-02-27

### Added

- Search addresses by name
- Buckets queries
- Array support to field filters

### Changed

- tools/wsGet, add file stream to support big exports
- Rename circulating fields

### Fixed

- API/Address.getMiners

## [1.0.3] - 2020-01-03

### Added

- Decode bridge events
- Indexed _addresses field to events collection
- _metadata field to blocks that includes: txDensity, hashrate and time
- Transactions channel
- CirculatingSupply to stats
- ActiveAccounts to stats

### Changed

- ContractParser, remove web3 dependency
- Refactor ContractParser as rsk-contract-parser
- Refactor utils as rsk-utils
- Status collection to capped collection
- Remove transactions from blocks channel
- Remove disabled modules from API interactive documentation

### Fixed

- Indexed ids on events and transactions, that produced errors in some queries
- tools/getBlock
- swagger.json url

### Removed

- ExtendedStats module

## [1.0.2] - 2019-09-16

### Fixed

- api/modules/Event.getEventsByAddress, addressData

## [1.0.1] - 2019-09-11

### Changed

- Mongodb client to 3.3.2
- Express to 4.17.1
- MongoClient connection options

## [1.0.0] - 2019-08-30

### Removed

- config.publicSettings

### Added

- Optional configuration file: initial-config.json
- ABI of PoolBlockReward
- API contractVerifier module which exposes the methods:
  - verify
  - getSolcVersions
  - getEvmVersions
  - getVerificationResults
- API extendedStats module
- API summary module that provides all scrapped and decoded data from one block in one document.
- Setup module which stores the blockchain configuration on database and checks
  against the node, at start, to avoid inserting data from another blockchain on the same database.  
- The API now exposes network information  such as the addresses of native contracts (pre configured) and the chainId

## [0.8.0] - 2019-06-03

### Added

- Websocket channels and subscriptions
- Auto generated API documentation
- API http endpoints
- API stats module
- API stats channel
- API addresses.getMiners()
- Services/Address, include last block mined in miners documents.
- tools/wsChannel

### Changed

- The websocket API, don't broadcasts messages any more,
  to listen to changes a channel subscription is required.
- API responses: remove 'result' container
- API: added 'miner' filter to blocks.getBlocks()
- Renamed API module 'txs' to 'transactions'
- Updated tools/statusClient to channels API

## [0.7.4] - 2019-03-13

### Added

- Tools/updateContractAccounts
- API/Blocks.circulatingSupply()
- API/Address.getCirculatingSupply()
- Routes/circulating

### Changed

- http server
- Queries and collections indexes to improve performance
- API/Token/getTokenBalance: include filter by addresses 
  and add account balance when filter is present 

### Fixed

- Tools/getBlock: help message
- Services/classes/Block.deleteBlockDataFromDb

## [0.7.3] - 2019-03-04

### Changed

- DataCollectorItem.getOne()

### Fixed

- API/Txs.getTransactionWithAddressData()

### Removed

- WS automatic (broadcasted) announcements

## [0.7.2] - 2019-03-01
### Added

- Remasc events decoder
- API/TokenAccount.getTokenBalance()
- API/Event.getAllEventsByAddress()

### Changed

- API/Event.getEventsByAddress()

### Fixed

- Tools/wsGet

## [0.7.1] - 2019-02-21

### Added

- API/Addresses: contract creation sort

### Changed

- Tx collection indexes
- API/Address, sort by contract creation date

### Removed

- API/Txs, sort by timestamp

## [0.7.0] - 2019-02-20

### Added

- DataCollector: cursor pagination
- Log request to API
- DataCollector
  - Defaults fields
  - getPages param

### Changed

- Pagination system to cursor pagination
- Transactions and events IDs
- API sortable fields and defaults sorts
- API/Addresses.txBalance
- Block.save() resets address.txBalance to 0 when saves an address
- Change userEvents.updateAddress: if !txBalance update from txs in db
- Add txBalance to getAddress delayedFields
- DataCollector, count records as default was removed,
  to enable it, two boolean params were added: count and countOnly.
  From now pagination total is null as default.
- Added field selection to DataCollector through 'fields' parameter.
- Add 'count' and 'countOnly" parameters to pagination methods
- The way to get address balance from transactions
- Services/classes/Address.updateTxBalance()
- Services/classes/Block, runs Address.updateTxBalance() on Block.save()
- Tools/wsGet to new API
- Collections indexes

### Removed

- API/index
- dbPatches
- API/Addresses.getAddress(), query param

### Fixed

- services/Block.deleteBlockDataFromDb
- services/blockChecker, handle promise rejection

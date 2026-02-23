-- RSK Explorer Database Schema V1.2.4
/*

V1.2.4 Notes:
- Added new columns and indexes to verification_result table

V1.2.3 Notes:
- Normalized SQL schema across environments

V1.2.2 Notes:
- Updated event foreign key to point to receipt table

V1.2.1 Notes:
- Fixed typo in table creation for receipt.is_successful (isSuccessful -> is_successful)
- Implemented receipt table
- Logs reconstruction using event table
  * receipt.logs (VARCHAR) is maintained for backward compatibility
  * Logs are stored individually in event table with transaction_hash and log_index
  * To reconstruct: SELECT * FROM event WHERE transaction_hash = ? ORDER BY log_index
  * Topics array is reconstructed from event.topic0, topic1, topic2, topic3 as: topics = [topic0, topic1, topic2, topic3] (filtering NULLs)
  * Index added: idx_event_transaction_hash_log_index for optimized JOIN queries

V1.1.6 Notes:
- add is_successful column to transaction table

V1.1.5 Notes:
- add status field to transaction table
- add index on table transaction(status)

V1.1.4 Notes:
- add index on table transaction_in_pool(pool_id)

V1.1.3 Notes:
- add index on table contract(symbol)

- add datetime field to internal_transaction and tx_pool tables
- add index for internal_transaction(datetime) and tx_pool(datetime)

- add datetime, date and gas_used fields to transaction table
- add index for transaction(datetime)
- add index for transaction(date)

- add daily gas fees table
- add new addresses table
- add daily active addresses table
- add daily number of transactions table

V1.1.2 Notes:
- add index for address(name)
- add index for transaction(timestamp)

V1.1.1 Notes:

- add an index for received field in block table
- add an index for timestamp field in tx_pool table

V1.1.0 Notes:

- Redesign of event table. Now topics are indexed columns.
- Add an index for transaction_index in transaction table
- Add an index for hash in block table

V1.0.11 Notes:

- Added timestamp to transaction_pending

V1.0.10 Notes:

- Optimize event queries by signature

V1.0.9 Notes:

- change balances id type to BIGINT

V1.0.8 Notes:

Optimizations for:

- blocks
- transactions
- internal transactions
- tokens

V1.0.7 Notes:

Optimizations for:

- internal transactions: created a new table for involved addresses in an itx

V1.0.6 Notes:

Optimizations for:

internal transactions 
transactions
event
summary
verification results

V1.0.5 Notes:

Optimizations:
- Added an index for transactions endpoints call
- Optimized events calls (new events addresses storage format and new indexes added)

V1.0.4 Notes:

- Added relevant indexes for efficient sorting in some tables
- Refactored block summary tables
- small fix in tx pool related tables

V1.0.3 Notes:

- timestamp, created, received and hashrate fields are now stored as INT8.
- rename table txpool to tx_pool
- fix txs in tx_pool
*/

CREATE TABLE block (
_id UUID DEFAULT gen_random_uuid(),
number INT4 PRIMARY KEY,
hash VARCHAR(66) UNIQUE,
parent_hash VARCHAR(66) NOT NULL,
sha3_uncles VARCHAR(66) NOT NULL,
logs_bloom VARCHAR NOT NULL,
transactions_root VARCHAR(66) NOT NULL,
state_root VARCHAR(66) NOT NULL,
receipts_root VARCHAR(66) NOT NULL,
miner VARCHAR NOT NULL,
difficulty VARCHAR NOT NULL,
total_difficulty VARCHAR NOT NULL,
extra_data VARCHAR NOT NULL,
size INT4 NOT NULL,
gas_limit INT4 NOT NULL,
gas_used INT4 NOT NULL,
timestamp INT8 NOT NULL,
transactions VARCHAR, -- stringified
uncles VARCHAR, -- stringified
minimum_gas_price VARCHAR NOT NULL,
bitcoin_merged_mining_header VARCHAR NOT NULL,
bitcoin_merged_mining_coinbase_transaction VARCHAR NOT NULL,
bitcoin_merged_mining_merkle_proof VARCHAR NOT NULL,
hash_for_merged_mining VARCHAR(66) NOT NULL,
paid_fees VARCHAR NOT NULL,
cumulative_difficulty VARCHAR NOT NULL,
received INT8 NOT NULL
);
CREATE INDEX ON block(miner);
CREATE INDEX ON block(hash);
CREATE INDEX ON block(received);
CREATE INDEX block_timestamp_idx ON block(timestamp);

CREATE TABLE stats (
block_number INT4 PRIMARY KEY,
block_hash VARCHAR NOT NULL,
active_accounts INT4 NOT NULL,
hashrate VARCHAR NOT NULL,
circulating_supply VARCHAR,
total_supply INT4,
bridge_balance VARCHAR,
locking_cap VARCHAR,
timestamp INT8 NOT NULL,
CONSTRAINT fk_stats_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON UPDATE CASCADE ON DELETE CASCADE,
CONSTRAINT fk_stats_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX ON stats(block_hash);

CREATE TABLE tx_pool (
id SERIAL PRIMARY KEY,
block_number INT4 NOT NULL,
pending INT4 NOT NULL,
queued INT4 NOT NULL,
txs VARCHAR NOT NULL, -- stringified
timestamp INT8 NOT NULL,
datetime TIMESTAMP WITH TIME ZONE
);
CREATE INDEX ON tx_pool(timestamp);
CREATE INDEX idx_tx_pool_datetime ON tx_pool(datetime);

CREATE TABLE transaction_pending (
hash VARCHAR(66) PRIMARY KEY,
block_hash VARCHAR(66) NOT NULL,
"from" VARCHAR(42) NOT NULL,
"to" VARCHAR(42) NOT NULL,
block_number INT4 NOT NULL,
transaction_index INT4 NOT NULL,
nonce INT4 NOT NULL,
gas INT4 NOT NULL,
gas_price VARCHAR NOT NULL,
value VARCHAR NOT NULL,
input VARCHAR NOT NULL,
status VARCHAR NOT NULL,
timestamp VARCHAR NOT NULL DEFAULT CAST(DATE_PART('epoch', NOW()) AS VARCHAR)
);
CREATE INDEX transaction_pending_timestamp_idx ON transaction_pending(timestamp);

CREATE TABLE transaction_in_pool (
hash VARCHAR(66),
pool_id INT,
block_hash VARCHAR(66) NOT NULL,
"from" VARCHAR(42) NOT NULL,
"to" VARCHAR(42) NOT NULL,
block_number INT4 NOT NULL,
transaction_index INT4 NOT NULL,
nonce INT4 NOT NULL,
gas INT4 NOT NULL,
gas_price VARCHAR NOT NULL,
value VARCHAR NOT NULL,
input VARCHAR NOT NULL,
status VARCHAR NOT NULL,
CONSTRAINT pk_transaction_in_pool_hash_poolId PRIMARY KEY (hash, pool_id),
CONSTRAINT fk_transaction_in_pool_poolId FOREIGN KEY (pool_id) REFERENCES tx_pool(id)
);
CREATE INDEX idx_transaction_in_pool_pool_id ON transaction_in_pool(pool_id);

CREATE TABLE address (
id SERIAL,
address VARCHAR(42) PRIMARY KEY,
is_native BOOLEAN NOT NULL,
type VARCHAR NOT NULL,
name VARCHAR -- NULL | string
);
CREATE INDEX address_name_idx ON address(name);
CREATE UNIQUE INDEX idx_address_id ON address(id);

CREATE TABLE miner_address (
id SERIAL,
address VARCHAR(42) PRIMARY KEY,
is_native BOOLEAN NOT NULL,
type VARCHAR NOT NULL,
name VARCHAR,
balance VARCHAR,
block_number INT,
last_block_mined VARCHAR,
last_block_mined_number INT UNIQUE,
FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE
);

CREATE TABLE balance (
id BIGSERIAL PRIMARY KEY,
address VARCHAR(42) NOT NULL,
balance VARCHAR NOT NULL, -- string | number but handled AT converter
block_number INT4 NOT NULL,
block_hash VARCHAR(66) NOT NULL,
timestamp INT8 NOT NULL,
created INT8 NOT NULL,
CONSTRAINT fk_balance_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_balance_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_balance_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
);
CREATE INDEX idx_balance_address ON balance(address);
CREATE INDEX idx_balance_block_number ON balance(block_number);
CREATE INDEX ON balance(block_hash);
CREATE INDEX idx_balance_address_block_number ON balance(address, block_number DESC);
CREATE INDEX idx_balance_address_id ON balance(address, id DESC);

CREATE TABLE address_latest_balance (
address VARCHAR(42) PRIMARY KEY,
balance VARCHAR NOT NULL,
block_number INT4 NOT NULL,
CONSTRAINT fk_balance_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_balance_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE
);

CREATE TABLE transaction (
hash VARCHAR(66) PRIMARY KEY,
tx_id VARCHAR NOT NULL,
type VARCHAR,
tx_type VARCHAR NOT NULL,
"from" VARCHAR(42) NOT NULL,
"to" VARCHAR(42),
block_number INT4 NOT NULL,
block_hash VARCHAR(66) NOT NULL,
transaction_index INT4 NOT NULL,
nonce INT4 NOT NULL,
gas INT4 NOT NULL,
gas_price VARCHAR NOT NULL,
value VARCHAR NOT NULL,
input VARCHAR,
v VARCHAR,
r VARCHAR,
s VARCHAR,
timestamp INT8 NOT NULL,
datetime TIMESTAMP WITH TIME ZONE,
date date,
gas_used INT,
status VARCHAR,
is_successful BOOLEAN,
receipt VARCHAR NOT NULL, -- stringified
CONSTRAINT fk_transaction_from FOREIGN KEY ("from") REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_transaction_to FOREIGN KEY ("to") REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_transaction_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_transaction_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_transaction_tx_id ON transaction(tx_id);
CREATE INDEX idx_transaction_block_number ON transaction(block_number);
CREATE INDEX idx_transaction_block_hash ON transaction(block_hash);
CREATE INDEX idx_transaction_from ON transaction("from");
CREATE INDEX idx_transaction_to ON transaction("to");
CREATE INDEX idx_transaction_tx_type ON transaction(tx_type);
CREATE INDEX transaction_transaction_index_idx ON transaction(transaction_index);
CREATE INDEX transaction_timestamp_idx ON transaction(timestamp);
CREATE INDEX idx_transaction_datetime ON transaction(datetime);
CREATE INDEX idx_transaction_date ON transaction(date);
CREATE INDEX idx_transaction_status ON transaction(status);
CREATE INDEX idx_transaction_is_successful ON transaction(is_successful);
CREATE INDEX idx_transaction_is_successful_to ON TRANSACTION ("to", is_successful);
CREATE INDEX idx_transaction_is_successful_from ON TRANSACTION ("from", is_successful);
CREATE INDEX idx_transaction_is_successful_tx_id ON TRANSACTION (tx_id, is_successful);
CREATE UNIQUE INDEX unique_block_number_transaction_index ON transaction(block_number, transaction_index);
CREATE INDEX idx_transaction_blocknumber_transactionindex ON transaction(block_number, transaction_index DESC);
CREATE INDEX idx_transaction_blocknumber_transactionindex_desc ON transaction(block_number DESC, transaction_index DESC);
CREATE INDEX idx_transaction_blocknumber_transactionindex_reverse ON transaction(block_number DESC, transaction_index);
CREATE INDEX idx_transaction_date_recent ON transaction(date) WHERE (date >= '2024-10-01'::date);
CREATE INDEX idx_transaction_from_txid_desc ON transaction("from", tx_id DESC);
CREATE INDEX idx_transaction_recent_blocks ON transaction(date) WHERE (block_number >= 5600000);
CREATE INDEX idx_transaction_to_txid_desc ON transaction("to", tx_id DESC);

CREATE TABLE receipt (
transaction_hash VARCHAR(66) PRIMARY KEY,
contract_address VARCHAR(42),
logs_bloom VARCHAR NOT NULL,
cumulative_gas_used INT4 NOT NULL,
effective_gas_price VARCHAR,
block_hash VARCHAR(66) NOT NULL,
logs VARCHAR NOT NULL, -- stringified (legacy, maintained for backward compatibility)
-- NOTE: Logs can be reconstructed from event table using:
-- SELECT * FROM event WHERE transaction_hash = receipt.transaction_hash ORDER BY log_index
-- Topics array is reconstructed from event.topic0, topic1, topic2, topic3 as: topics = [topic0, topic1, topic2, topic3] (filtering NULLs)
block_number INT4 NOT NULL,
gas_used INT4 NOT NULL,
"to" VARCHAR(42),
"from" VARCHAR(42),
type VARCHAR NOT NULL,
status VARCHAR NOT NULL,
transaction_index INT4 NOT NULL,
CONSTRAINT fk_receipt_transaction_hash FOREIGN KEY (transaction_hash) REFERENCES transaction(hash) ON DELETE CASCADE,
CONSTRAINT fk_receipt_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_receipt_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE,
CONSTRAINT fk_receipt_from FOREIGN KEY ("from") REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_receipt_to FOREIGN KEY ("to") REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_receipt_contract_address FOREIGN KEY (contract_address) REFERENCES address(address) ON DELETE CASCADE
);
CREATE INDEX idx_receipt_block_number ON receipt(block_number);
CREATE INDEX idx_receipt_block_hash ON receipt(block_hash);
CREATE INDEX idx_receipt_from ON receipt("from");
CREATE INDEX idx_receipt_to ON receipt("to");
CREATE INDEX idx_receipt_status ON receipt(status);
CREATE INDEX idx_receipt_contract_address ON receipt(contract_address);

CREATE TABLE internal_transaction (
internal_tx_id VARCHAR PRIMARY KEY,
transaction_hash VARCHAR(66) NOT NULL,
block_number INT4 NOT NULL,
block_hash VARCHAR(66) NOT NULL,
transaction_position INT4 NOT NULL,
type VARCHAR NOT NULL,
subtraces INT4 NOT NULL,
trace_address VARCHAR,
result VARCHAR,
index INT4 NOT NULL,
timestamp INT8 NOT NULL,
datetime TIMESTAMP WITH TIME ZONE,
error VARCHAR,
action VARCHAR, -- stringified
CONSTRAINT fk_internal_transaction_transaction_hash FOREIGN KEY (transaction_hash) REFERENCES transaction(hash) ON DELETE CASCADE,
CONSTRAINT fk_internal_transaction_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_internal_transaction_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
);
CREATE INDEX idx_internal_transaction_transaction_hash ON internal_transaction(transaction_hash);
CREATE INDEX idx_internal_transaction_block_number ON internal_transaction(block_number);
CREATE INDEX idx_internal_transaction_block_hash ON internal_transaction(block_hash);
CREATE INDEX idx_internal_transaction_datetime ON internal_transaction(datetime);

CREATE TABLE address_in_itx (
address VARCHAR NOT NULL,
internal_tx_id VARCHAR NOT NULL,
role VARCHAR NOT NULL,
PRIMARY KEY (address, internal_tx_id, role),
FOREIGN KEY (internal_tx_id) REFERENCES internal_transaction(internal_tx_id) ON DELETE CASCADE,
FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE
);
CREATE INDEX ON address_in_itx(internal_tx_id);

CREATE TABLE contract (
address VARCHAR(42) PRIMARY KEY,
code VARCHAR, -- NULL | string
code_stored_at_block INT4,
deployed_code VARCHAR,
symbol VARCHAR, -- NULL | string
decimals INT2, -- NULL | string | number
CONSTRAINT fk_contract_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_contract_code_stored_at_block FOREIGN KEY (code_stored_at_block) REFERENCES block(number) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX ON contract(code_stored_at_block);
CREATE INDEX idx_contract_symbol ON contract(symbol);

CREATE TABLE contract_creation_tx (
contract_address VARCHAR PRIMARY KEY,
timestamp INT8,
tx VARCHAR,
CONSTRAINT fk_contract_creation_tx_contract_address FOREIGN KEY (contract_address) REFERENCES contract(address) ON DELETE CASCADE
);

CREATE TABLE contract_destruction_tx (
contract_address VARCHAR PRIMARY KEY,
timestamp INT8,
tx VARCHAR,
CONSTRAINT fk_contract_destruction_tx_contract_address FOREIGN KEY (contract_address) REFERENCES address(address) ON DELETE CASCADE
);

CREATE TABLE total_supply (
contract_address VARCHAR(42),
block_number INT,
total_supply VARCHAR NOT NULL,
CONSTRAINT pk_total_supply PRIMARY KEY (contract_address, block_number),
CONSTRAINT fk_total_supply_address FOREIGN KEY (contract_address) REFERENCES contract(address) ON DELETE CASCADE,
CONSTRAINT fk_total_supply_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE
);

CREATE TABLE token_address (
address VARCHAR(42),
contract VARCHAR(42),
block_number INT4,
block_hash VARCHAR NOT NULL,
balance VARCHAR,
CONSTRAINT pk_token_address PRIMARY KEY (address, contract, block_number),
CONSTRAINT fk_token_address_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_token_address_contract FOREIGN KEY (contract) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_token_address_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_token_address_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
);
CREATE INDEX ON token_address(address);
CREATE INDEX idx_token_address_contract ON token_address(contract);
CREATE INDEX ON token_address(block_number);
CREATE INDEX ON token_address(block_hash);

CREATE TABLE contract_method (
method VARCHAR,
contract_address VARCHAR(42),
CONSTRAINT pk_contract_method PRIMARY KEY (method, contract_address),
CONSTRAINT fk_contract_method_contract_address FOREIGN KEY (contract_address) REFERENCES contract(address) ON DELETE CASCADE
);

CREATE TABLE contract_interface (
interface VARCHAR,
contract_address VARCHAR(42),
CONSTRAINT pk_contract_interface PRIMARY KEY (interface, contract_address),
CONSTRAINT fk_contract_interface_contract_address FOREIGN KEY (contract_address) REFERENCES contract(address) ON DELETE CASCADE
);

CREATE TABLE event (
event_id VARCHAR PRIMARY KEY,
abi VARCHAR, -- stringified
address VARCHAR(42) NOT NULL,
args VARCHAR, -- stringified
topic0 VARCHAR,
topic1 VARCHAR,
topic2 VARCHAR,
topic3 VARCHAR,
block_hash VARCHAR(66) NOT NULL,
block_number INT4 NOT NULL,
data VARCHAR NOT NULL,
event VARCHAR,
log_index INT4 NOT NULL,
signature VARCHAR,
timestamp INT8 NOT NULL,
transaction_hash VARCHAR(66) NOT NULL,
transaction_index INT4 NOT NULL,
tx_status VARCHAR NOT NULL,
CONSTRAINT fk_event_transaction_hash FOREIGN KEY (transaction_hash) REFERENCES receipt(transaction_hash) ON DELETE CASCADE,
CONSTRAINT fk_event_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_event_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE,
CONSTRAINT fk_event_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE
);
CREATE INDEX idx_event_block_number ON event(block_number);
CREATE INDEX ON event(block_hash);
CREATE INDEX idx_event_address ON event(address);
CREATE INDEX idx_event_signature ON event(signature);
CREATE INDEX ON event(transaction_hash);
CREATE INDEX ON event(topic0);
CREATE INDEX ON event(topic1);
CREATE INDEX ON event(topic2);
CREATE INDEX ON event(topic3);
CREATE INDEX idx_event_transaction_hash_log_index ON event(transaction_hash, log_index);
CREATE INDEX idx_event_address_event_event_id ON event(address, event, event_id DESC);
CREATE INDEX idx_event_event ON event(event);
CREATE INDEX idx_event_lowercase_event ON event(lower((event)::text));

CREATE TABLE address_in_event (
event_id VARCHAR,
address VARCHAR(42),
is_event_emitter_address BOOLEAN,
event_signature VARCHAR,
PRIMARY KEY (event_id, address, is_event_emitter_address),
FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE
);
CREATE INDEX idx_address_in_event_address ON address_in_event(address);
CREATE INDEX idx_address_in_event_event_id ON address_in_event(event_id);
CREATE INDEX ON address_in_event(event_signature);

CREATE TABLE block_trace (
block_hash VARCHAR(66),
internal_tx_id VARCHAR,
CONSTRAINT pk_block_trace PRIMARY KEY (block_hash, internal_tx_id),
CONSTRAINT fk_block_trace_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE,
CONSTRAINT fk_block_trace_internal_tx_id FOREIGN KEY (internal_tx_id) REFERENCES internal_transaction(internal_tx_id) ON DELETE CASCADE
);
CREATE INDEX ON block_trace(internal_tx_id);

CREATE TABLE status (
id SERIAL PRIMARY KEY,
timestamp INT8 NOT NULL,
pending_blocks INT4 NOT NULL,
requesting_blocks INT4 NOT NULL,
node_down BOOLEAN NOT NULL
);

CREATE TABLE block_summary (
block_number INT4 PRIMARY KEY,
hash VARCHAR NOT NULL,
timestamp INT8 NOT NULL,
FOREIGN KEY (hash) REFERENCES block(hash) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE
);
CREATE INDEX idx_block_summary_hash ON block_summary(hash);

CREATE TABLE transaction_in_summary (
hash VARCHAR,
block_number INT4,
PRIMARY KEY (hash, block_number),
FOREIGN KEY (hash) REFERENCES transaction(hash) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block_summary(block_number) ON DELETE CASCADE
);
CREATE INDEX ON transaction_in_summary(block_number);

CREATE TABLE internal_transaction_in_summary (
internal_tx_id VARCHAR,
block_number INT4,
PRIMARY KEY (internal_tx_id, block_number),
FOREIGN KEY (internal_tx_id) REFERENCES internal_transaction(internal_tx_id) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block_summary(block_number) ON DELETE CASCADE
);
CREATE INDEX ON internal_transaction_in_summary(block_number);

CREATE TABLE address_in_summary (
address VARCHAR(42),
balance VARCHAR,
block_number INT4,
last_block_mined INT4,
PRIMARY KEY (address, block_number),
FOREIGN KEY (last_block_mined) REFERENCES block(number) ON DELETE CASCADE,
FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block_summary(block_number) ON DELETE CASCADE
);
CREATE INDEX ON address_in_summary(block_number);
CREATE INDEX ON address_in_summary(last_block_mined);

CREATE TABLE token_address_in_summary (
address VARCHAR,
contract VARCHAR,
block_number INT4,
PRIMARY KEY (address, contract, block_number),
FOREIGN KEY (address, contract, block_number) REFERENCES token_address(address, contract, block_number) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block_summary(block_number) ON DELETE CASCADE
);
CREATE INDEX ON token_address_in_summary(block_number);

CREATE TABLE event_in_summary (
event_id VARCHAR,
block_number INT4,
PRIMARY KEY (event_id, block_number),
FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block_summary(block_number) ON DELETE CASCADE
);
CREATE INDEX ON event_in_summary(block_number);

CREATE TABLE suicide_in_summary (
internal_tx_id VARCHAR,
block_number INT4,
PRIMARY KEY (internal_tx_id, block_number),
FOREIGN KEY (internal_tx_id) REFERENCES internal_transaction(internal_tx_id) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block_summary(block_number) ON DELETE CASCADE
);

-- explorer initial config
CREATE TABLE explorer_initial_config (
id VARCHAR PRIMARY KEY,
native_contracts VARCHAR, -- stringified
net VARCHAR -- strigified
);

-- explorer settings
CREATE TABLE explorer_settings (
  id VARCHAR PRIMARY KEY,
  hash VARCHAR NOT NULL
);

/* Contract verifier */

-- contract verifier config
CREATE TABLE contract_verifier_solc_versions (
	id VARCHAR PRIMARY KEY,
	builds VARCHAR, -- stringified
	latest_release VARCHAR,
	releases VARCHAR -- stringified
);

CREATE TABLE contract_verification (
  _id VARCHAR PRIMARY KEY,
  address VARCHAR,
  error VARCHAR,
  match BOOLEAN,
  request VARCHAR, -- stringified
  result VARCHAR, -- stringified
  timestamp INT8
);

CREATE TABLE verification_result (
  _id VARCHAR PRIMARY KEY,
  abi VARCHAR, --stringified
  address VARCHAR,
  match BOOLEAN,
  request VARCHAR, -- stringified
  result VARCHAR, -- stringified
  sources VARCHAR, -- stringified
  timestamp INT8,
  status VARCHAR,
  contract_name VARCHAR(255),
  verification_date TIMESTAMP WITH TIME ZONE,
  optimization_enabled BOOLEAN,
  optimization_runs INT,
  compiler_version VARCHAR(100),
  evm_version VARCHAR(50),
  source_files JSONB,
  encoded_constructor_arguments TEXT,
  constructor_arguments TEXT,
  deployment_bytecode TEXT,
  evm_bytecode TEXT,
  libraries JSONB,
  method_identifiers JSONB,
  remappings JSONB,
  via_ir BOOLEAN,
  language VARCHAR(50),
  bytecode_hash VARCHAR(66)
);
CREATE INDEX idx_verification_result_address ON verification_result(address);
CREATE INDEX idx_verification_result_match ON verification_result(match);
CREATE INDEX idx_verification_result_status ON verification_result(status);
CREATE INDEX idx_verification_result_timestamp ON verification_result(timestamp);
CREATE INDEX idx_verification_result_contract_name ON verification_result(contract_name);
CREATE INDEX idx_verification_result_compiler_version ON verification_result(compiler_version);
CREATE INDEX idx_verification_result_evm_version ON verification_result(evm_version);
CREATE INDEX idx_verification_result_optimization_enabled ON verification_result(optimization_enabled);
CREATE INDEX idx_verification_result_verification_date ON verification_result(verification_date);
CREATE INDEX idx_verification_result_language ON verification_result(language);
CREATE INDEX idx_verification_result_bytecode_hash ON verification_result(bytecode_hash);

-- Daily gas fees
CREATE TABLE bo_gas_fee_daily_aggregated (
    date_1 DATE PRIMARY KEY,
    gas_fee NUMERIC
);

-- New addresses
CREATE TABLE bo_new_addresses (
    address TEXT PRIMARY KEY,
    first_transaction_date DATE
);

-- Daily active addresses
CREATE TABLE bo_active_addresses_daily_aggregated (
    date_1 DATE PRIMARY KEY,
    active_addresses INT
);

-- Daily number of transactions
CREATE TABLE bo_number_transactions_daily_aggregated (
    date_1 DATE PRIMARY KEY,
    number_of_transactions INT
);
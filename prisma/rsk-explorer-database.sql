-- RSK Explorer Database Schema V1.0.10

/*

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

CREATE TABLE stats (
block_number INT4 PRIMARY KEY,
block_hash VARCHAR NOT NULL,
active_accounts INT4 NOT NULL,
hashrate INT8 NOT NULL,
circulating_supply VARCHAR,
total_supply INT4,
bridge_balance VARCHAR,
locking_cap VARCHAR,
timestamp INT8 NOT NULL,
CONSTRAINT fk_stats_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON UPDATE CASCADE ON DELETE CASCADE,
CONSTRAINT fk_stats_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE tx_pool (
id SERIAL PRIMARY KEY,
block_number INT4 NOT NULL,
pending INT4 NOT NULL,
queued INT4 NOT NULL,
txs VARCHAR NOT NULL, -- stringified
timestamp INT8 NOT NULL
);

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
status VARCHAR NOT NULL
);

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

CREATE TABLE address (
id SERIAL,
address VARCHAR(42) PRIMARY KEY,
is_native BOOLEAN NOT NULL,
type VARCHAR NOT NULL,
name VARCHAR -- NULL | string
);
CREATE INDEX index_address_id ON address(id);

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
receipt VARCHAR NOT NULL, -- stringified
CONSTRAINT fk_transaction_from FOREIGN KEY ("from") REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_transaction_to FOREIGN KEY ("to") REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_transaction_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_transaction_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
);
CREATE INDEX idx_transaction_tx_id ON transaction(tx_id);
CREATE INDEX idx_transaction_block_number ON transaction(block_number);
CREATE INDEX idx_transaction_block_hash ON transaction(block_hash);
CREATE INDEX idx_transaction_from ON transaction("from");
CREATE INDEX idx_transaction_to ON transaction("to");
CREATE INDEX idx_transaction_tx_type ON transaction(tx_type);

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
error VARCHAR,
action VARCHAR, -- stringified
CONSTRAINT fk_internal_transaction_transaction_hash FOREIGN KEY (transaction_hash) REFERENCES transaction(hash) ON DELETE CASCADE,
CONSTRAINT fk_internal_transaction_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_internal_transaction_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
);
CREATE INDEX idx_internal_transaction_transaction_hash ON internal_transaction(transaction_hash);
CREATE INDEX idx_internal_transaction_block_number ON internal_transaction(block_number);
CREATE INDEX idx_internal_transaction_block_hash ON internal_transaction(block_hash);

CREATE TABLE address_in_itx (
address VARCHAR NOT NULL,
internal_tx_id VARCHAR NOT NULL,
role VARCHAR NOT NULL,
PRIMARY KEY (address, internal_tx_id, role),
FOREIGN KEY (internal_tx_id) REFERENCES internal_transaction(internal_tx_id) ON DELETE CASCADE,
FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE
);

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
topics VARCHAR, -- stringified
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
CONSTRAINT fk_event_transaction_hash FOREIGN KEY (transaction_hash) REFERENCES transaction(hash) ON DELETE CASCADE,
CONSTRAINT fk_event_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_event_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE,
CONSTRAINT fk_event_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE
);
CREATE INDEX idx_event_block_number ON event(block_number);
CREATE INDEX idx_event_address ON event(address);
CREATE INDEX idx_event_signature ON event(signature);


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

CREATE TABLE internal_transaction_in_summary (
internal_tx_id VARCHAR,
block_number INT4,
PRIMARY KEY (internal_tx_id, block_number),
FOREIGN KEY (internal_tx_id) REFERENCES internal_transaction(internal_tx_id) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block_summary(block_number) ON DELETE CASCADE
);

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

CREATE TABLE token_address_in_summary (
address VARCHAR,
contract VARCHAR,
block_number INT4,
PRIMARY KEY (address, contract, block_number),
FOREIGN KEY (address, contract, block_number) REFERENCES token_address(address, contract, block_number) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block_summary(block_number) ON DELETE CASCADE
);

CREATE TABLE event_in_summary (
event_id VARCHAR,
block_number INT4,
PRIMARY KEY (event_id, block_number),
FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
FOREIGN KEY (block_number) REFERENCES block_summary(block_number) ON DELETE CASCADE
);

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
  address VARCHAR UNIQUE,
  match BOOLEAN,
  request VARCHAR, -- stringified
  result VARCHAR, -- stringified
  sources VARCHAR, -- stringified
  timestamp INT8
);
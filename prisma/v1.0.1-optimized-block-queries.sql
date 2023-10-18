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
timestamp VARCHAR NOT NULL,
transactions VARCHAR, -- stringified
uncles VARCHAR, -- stringified
minimum_gas_price VARCHAR NOT NULL,
bitcoin_merged_mining_header VARCHAR NOT NULL,
bitcoin_merged_mining_coinbase_transaction VARCHAR NOT NULL,
bitcoin_merged_mining_merkle_proof VARCHAR NOT NULL,
hash_for_merged_mining VARCHAR(66) NOT NULL,
paid_fees VARCHAR NOT NULL,
cumulative_difficulty VARCHAR NOT NULL,
received VARCHAR NOT NULL
);

CREATE TABLE stats (
block_number INT4 PRIMARY KEY,
block_hash VARCHAR NOT NULL,
active_accounts INT4 NOT NULL,
hashrate VARCHAR NOT NULL,
circulating_supply VARCHAR,
total_supply INT4,
bridge_balance VARCHAR,
locking_cap VARCHAR,
timestamp VARCHAR NOT NULL,
CONSTRAINT fk_stats_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON UPDATE CASCADE ON DELETE CASCADE,
CONSTRAINT fk_stats_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE txpool (
id SERIAL PRIMARY KEY,
block_number INT4 NOT NULL,
pending INT4 NOT NULL,
queued INT4 NOT NULL, 
timestamp VARCHAR NOT NULL
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
CONSTRAINT fk_transaction_in_pool_poolId FOREIGN KEY (pool_id) REFERENCES txpool(id)
);

CREATE TABLE address (
id SERIAL,
address VARCHAR(42) PRIMARY KEY,
is_native BOOLEAN NOT NULL,
type VARCHAR NOT NULL,
name VARCHAR -- NULL | string
);
CREATE INDEX index_address_id ON address(id);

CREATE TABLE miner (
address VARCHAR,
block_number INT UNIQUE,
CONSTRAINT pk_miner PRIMARY KEY (address, block_number),
CONSTRAINT fk_miner_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_miner_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE
);

CREATE TABLE balance (
id SERIAL PRIMARY KEY,
address VARCHAR(42) NOT NULL,
balance VARCHAR NOT NULL, -- string | number but handled AT converter
block_number INT4 NOT NULL,
block_hash VARCHAR(66) NOT NULL,
timestamp VARCHAR NOT NULL,
created VARCHAR NOT NULL,
CONSTRAINT fk_balance_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_balance_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_balance_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
);

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
timestamp VARCHAR NOT NULL,
CONSTRAINT fk_transaction_from FOREIGN KEY ("from") REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_transaction_to FOREIGN KEY ("to") REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_transaction_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_transaction_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
);

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
timestamp VARCHAR NOT NULL,
error VARCHAR,
action VARCHAR, -- stringified
action_from VARCHAR, -- index
action_to VARCHAR, -- index
CONSTRAINT fk_internal_transaction_transaction_hash FOREIGN KEY (transaction_hash) REFERENCES transaction(hash) ON DELETE CASCADE,
CONSTRAINT fk_internal_transaction_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_internal_transaction_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
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
timestamp VARCHAR,
tx VARCHAR,
CONSTRAINT fk_contract_creation_tx_contract_address FOREIGN KEY (contract_address) REFERENCES contract(address) ON DELETE CASCADE
);

CREATE TABLE contract_destruction_tx (
contract_address VARCHAR PRIMARY KEY,
timestamp VARCHAR,
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
CONSTRAINT fk_token_address_contract FOREIGN KEY (contract) REFERENCES contract(address) ON DELETE CASCADE,
CONSTRAINT fk_token_address_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_token_address_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE
);

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
timestamp VARCHAR NOT NULL,
transaction_hash VARCHAR(66) NOT NULL,
transaction_index INT4 NOT NULL,
tx_status VARCHAR NOT NULL,
CONSTRAINT fk_event_transaction_hash FOREIGN KEY (transaction_hash) REFERENCES transaction(hash) ON DELETE CASCADE,
CONSTRAINT fk_event_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_event_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE,
CONSTRAINT fk_event_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE
);

CREATE TABLE address_in_event (
event_id VARCHAR,
address VARCHAR(42),
PRIMARY KEY (event_id, address),
FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE
);

CREATE TABLE receipt (
transaction_hash VARCHAR(66) PRIMARY KEY,
transaction_index INT4 NOT NULL,
block_hash VARCHAR(66) NOT NULL,
block_number INT4 NOT NULL,
"from" VARCHAR(42) NOT NULL,
"to" VARCHAR(42),
type VARCHAR,
cumulative_gas_used INT4 NOT NULL,
gas_used INT4 NOT NULL,
contract_address VARCHAR(42),
logs VARCHAR NOT NULL, -- stringified
status VARCHAR NOT NULL,
logs_bloom VARCHAR NOT NULL,
CONSTRAINT fk_receipt_transaction_hash FOREIGN KEY (transaction_hash) REFERENCES transaction(hash) ON DELETE CASCADE,
CONSTRAINT fk_receipt_block_hash FOREIGN KEY (block_hash) REFERENCES block(hash) ON DELETE CASCADE,
CONSTRAINT fk_receipt_block_number FOREIGN KEY (block_number) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_receipt_from FOREIGN KEY ("from") REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_receipt_to FOREIGN KEY ("to") REFERENCES address(address) ON DELETE CASCADE
);

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
id VARCHAR PRIMARY KEY,
hash VARCHAR NOT NULL UNIQUE,
number INT NOT NULL,
timestamp INT NOT NULL,
CONSTRAINT fk_block_summary_hash FOREIGN KEY (hash) REFERENCES block(hash) ON DELETE CASCADE,
CONSTRAINT fk_block_summary_number FOREIGN KEY (number) REFERENCES block(number) ON DELETE CASCADE
);

CREATE TABLE transaction_in_summary (
hash VARCHAR,
summary_id VARCHAR,
CONSTRAINT pk_transaction_in_summary PRIMARY KEY (hash, summary_id),
CONSTRAINT fk_transaction_in_summary_hash FOREIGN KEY (hash) REFERENCES transaction(hash) ON DELETE CASCADE,
CONSTRAINT fk_transaction_in_summary_summary_id FOREIGN KEY (summary_id) REFERENCES block_summary(id) ON DELETE CASCADE
);

CREATE TABLE internal_transaction_in_summary (
internal_tx_id VARCHAR,
summary_id VARCHAR,
CONSTRAINT pk_internal_transaction_in_summary PRIMARY KEY (internal_tx_id, summary_id),
CONSTRAINT fk_internal_transaction_in_summary_internal_tx_id FOREIGN KEY (internal_tx_id) REFERENCES internal_transaction(internal_tx_id) ON DELETE CASCADE,
CONSTRAINT fk_internal_transaction_in_summary_summary_id FOREIGN KEY (summary_id) REFERENCES block_summary(id) ON DELETE CASCADE
);

CREATE TABLE address_in_summary (
address VARCHAR(42),
balance VARCHAR,
block_number INT,
last_block_mined INT,
summary_id VARCHAR,
CONSTRAINT pk_address_in_summary PRIMARY KEY (address, summary_id),
CONSTRAINT fk_address_in_summary_last_block_mined FOREIGN KEY (last_block_mined) REFERENCES block(number) ON DELETE CASCADE,
CONSTRAINT fk_address_in_summary_address FOREIGN KEY (address) REFERENCES address(address) ON DELETE CASCADE,
CONSTRAINT fk_address_in_summary_summary_id FOREIGN KEY (summary_id) REFERENCES block_summary(id) ON DELETE CASCADE
);

CREATE TABLE token_address_in_summary (
address VARCHAR,
contract VARCHAR,
block INT,
summary_id VARCHAR,
CONSTRAINT pk_token_address_in_summary PRIMARY KEY (address, contract, block, summary_id),
CONSTRAINT fk_token_address_in_memory_address_contract_block FOREIGN KEY (address, contract, block) REFERENCES token_address(address, contract, block_number) ON DELETE CASCADE,
CONSTRAINT fk_token_address_in_memory_summary_id FOREIGN KEY (summary_id) REFERENCES block_summary(id) ON DELETE CASCADE
);

CREATE TABLE event_in_summary (
event_id VARCHAR,
summary_id VARCHAR,
CONSTRAINT pk_event_in_summary PRIMARY KEY (event_id, summary_id),
CONSTRAINT fk_event_in_summary_event_id FOREIGN KEY (event_id) REFERENCES event(event_id) ON DELETE CASCADE,
CONSTRAINT fk_event_in_summary_summary_id FOREIGN KEY (summary_id) REFERENCES block_summary(id) ON DELETE CASCADE
);

CREATE TABLE suicide_in_summary (
internal_tx_id VARCHAR,
summary_id VARCHAR,
CONSTRAINT pk_suicide_in_summary PRIMARY KEY (internal_tx_id, summary_id),
CONSTRAINT fk_suicide_in_summary_internal_tx_id FOREIGN KEY (internal_tx_id) REFERENCES internal_transaction(internal_tx_id) ON DELETE CASCADE,
CONSTRAINT fk_suicide_in_summary_summary_id FOREIGN KEY (summary_id) REFERENCES block_summary(id) ON DELETE CASCADE
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
  timestamp VARCHAR
);

CREATE TABLE verification_result (
  _id VARCHAR PRIMARY KEY,
  abi VARCHAR, --stringified
  address VARCHAR,
  match BOOLEAN,
  request VARCHAR, -- stringified
  result VARCHAR, -- stringified
  sources VARCHAR, -- stringified
  timestamp VARCHAR
)
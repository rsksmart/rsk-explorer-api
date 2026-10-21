# NFT ownership integration tests

These tests check that the NFT tables (`token_transfer`, `nft_holder`, `nft_balance`, `token`, `token_state_at_block`) always match what the stored events say, after every save, delete and replace of a block.

They need a real Postgres. The NFT tables are derived from `event`, and nothing recomputes them later, so a wrong write stays wrong. What can break them lives in Postgres: row locks between concurrent writers, the Restrict foreign key to `block`, and the version check that refuses a stale write. Prisma adds its own limit of 32,767 query parameters per statement. A mock would not reproduce any of these.

## The files, most important first

1. `replay.js` rebuilds every NFT table from the stored events and compares it with the tables. Most tests end with this comparison.
2. `concurrency.spec.js` races saves, deletes and replaces of nearby blocks, with the database's default isolation set to read committed, then to repeatable read.
3. `fuzz.spec.js` saves and deletes random blocks in a random order and compares after every step.
4. `delete.spec.js` covers the delete and reorg paths: the Restrict key, a block replaced or deleted while a delete is in flight, and a replace in place.
5. `staleRead.spec.js` covers a save or delete whose read went stale before its batch committed.
6. `statementCount.spec.js` and `bindLimit.spec.js` check that a block's statements grow with holders, not with token ids, and stay under the query parameter limit.
7. `tokenState.spec.js` checks the token state written on a save and restored on a delete.
8. `backfill.spec.js`, `commandLine.spec.js` and `tokenNames.spec.js` cover the one-off backfill and re-detection tools. They can go once those tools have run in every environment.
9. `fixtures.js` builds the blocks and logs the tests save.

## Running them

Point `DATABASE_URL` at a Postgres database whose name ends in `_test` and that has the migrations applied (`npx prisma migrate deploy`). The tests empty its tables (blocks, transactions, events, addresses, balances and the NFT tables) and change its default isolation level for a while. With any other database name, the tests are skipped.

Then run `npx mocha test/integration/nftOwnership`. The 57 tests take about two minutes on a laptop.

The repository's CI does not run any tests today, so this suite runs only when someone starts it.

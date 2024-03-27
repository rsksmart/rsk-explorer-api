# Rsk Explorer API

# Requisites
- postgres
- node: v16+
- access to JSON/RPC interface of a rskj node >= 2.0.1 with this modules enabled: eth, net, web3, txpool, debug and trace.

# Configuration steps

## Section 1: Environment setup
- create a database 'explorer_db'
- create sql tables using the script prisma/rsk-explorer-database.sql
- Install pm2:
  - npm install -g pm2
  - Enable pm2 log rotation: pm2 install pm2-logrotate
  - Enable log-rotation compression: pm2 set pm2-logrotate:compress true
  - For more options:
    - see [pm2-logrotate](https://pm2.keymetrics.io/docs/usage/log-management/#pm2-logrotate-module)
    - see [pm2-logrotate configuration](https://github.com/keymetrics/pm2-logrotate#configure) to set the rotation options
- Configure database credentials, node urls, etc, in src/lib/defaultConfig.js file:

```javascript
{
  source: {
    protocol: 'http',
    node: 'localhost',
    port: 4444,
    url: null
  },
  sourceRoutes: { // Nod3Router routes, used as default when source is an array of sources
    subscribe: 0, // delegates subscriptions to the first node
    rsk: 0, // delegates rsk module to the node that handle subscriptions
    trace: 1 // delegates trace_ module to the second node
  },
  db: {
    protocol: 'postgres://',
    databaseName: 'explorer_db',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 12345678
  },
  api: {
    address: 'localhost',
    port: 3003,
    lastBlocks: 30,
    MIN_LIMIT: 10,
    LIMIT: 50,
    MAX_LIMIT: 500,
    MAX_PAGES: 10,
    allowUserEvents: false,
    exposeDoc: false,
    // All modules are enabled as default
    modules: setAllModules(true),
    delayedFields,
    allowCountQueries: false
  },
  blocks: {
    blocksQueueSize: 10,
    bcTipSize: 120,
    batchRequestSize: 20,
    debug: false,
    ports: [3010], // list of services ports, if the list runs out, the services will try to take the next  ports starting from the last
    address: '127.0.0.1',
    services
  },
  forceSaveBcStats: true,
  enableTxPoolFromApi: true
}
```

### api
- **address** [string] api server bind address
- **port**  [number] api server port
- **exposeDoc** [boolean]: serve rsk-openapi-ui on /doc to render swagger.json
- **allowUserEvents**  [boolean]: allow contractVerifier

### To enable contract verifier module:

The contractVerifier module requires a connection to a [rsk-contract-verifier](https://github.com/rsksmart/rsk-contract-verifier)
instance. The url must be provided on api section:

- set api.allowUserEvents to true
- add the contract verifier url inside api:
```javascript
api:{
  //... other configs,
  contractVerifier: {
      url: 'ws://localhost:3008'
    },
  //... other configs
}
```

## Section 3: Build process
Run commands:
- npm install
- npm run build
- npx prisma generate

## Start
- Start block service: npm run start-blocks
- Start api: npm run start-api

Note: an rsk node must be running in port or url specified in defaultConfig.js. Otherwise, blocks service will crash. 

## Section 4: Logs
To see block service logs:
- npm run blocks-logs-raw (production)
- npm run blocks-logs-pretty (development)

To see api logs:
- npm run api-logs-raw (production)
- npm run api-logs-pretty (development)

## Section 5: Tools

Get a block:
- node dist/tools/getBlock.js 4000 (print in console)
- node dist/tools/getBlock.js 4000 --save (print in console and also store in database)

Get missing segments in database:
- node dist/tools/missingSegments.js

## Components

The logic in charge of indexing the blockchain in the database and maintaining data integrity consists of 4 services:
- [blocks-checker-service]: ensures integrity of the most recent 120 blocks in database at the moment of running the service
- [savetip-service]: requests blocks inside the tip size threshold (the top 120 newest, starting from latest block)
- [live-syncer-service]: requests new blocks to the RSK node, starting from latest block
- [static-syncer-service]: Stores immutable blocks (starting from latest - 120). To do so, it checks database gaps between already indexed blocks, and requests the missing ones by iterating the gaps

API server: HTTP/WS server
- API Documentation: [docs](doc/api.md)
- Swagger docs: [open api specification](public/swagger.json)

## Development

Run api in development mode: npm run dev
Run blocks in development mode:

- npm run build
- npx prisma generate
- npm run blocks-start

Note Before uploading changes, remember to execute npm run build after upgrading version in package.version, so swagger docs compile the version number too. 
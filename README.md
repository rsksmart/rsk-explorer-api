# Rsk explorer api

## Description
  
  Rsk blockchain explorer

## Components

### API server

HTTP/WS server, see the documentation [here](doc/api.md).

### Blocks services

  Imports blockchain data from rsk node to DB.

- **blocksRouter:** routes messages between services *REQUIRED*
- **blocksListener:** listens to new blocks from node and announces them as service event.
- **blocksRequester:** requests blocks from node.
- **blocksChecker:** checks database for missing blocks and reorgs, emits missing/bad blocks.
- **txPool:** listens to node transactions pool and stores changes in the DB.
- **blocksBalances:** gets historical addresses balances and stores in the DB.
- **blocksStatus:** checks DB and node status and stores changes in the DB.
- **blocksStats:** gets BC stats and stores in the DB.

### User events service

(Optional)
 Allows to update fields on the fly and send async response to clients.

## Requisites

- mongodb > 4
- node >= 12.18.2
- access to JSON/RPC interface of a rskj node >= 2.0.1
  with this modules enabled: eth, net, web3, txpool, debug and trace.

## Install

- Install dependencies

``` shell
    npm install
  ```

## Create log dir

```shell
sudo mkdir /var/log/rsk-explorer
sudo chown $USER /var/log/rsk-explorer/
chmod 755 /var/log/rsk-explorer
```

Note: You can change the log folder in config.json

## Configuration file

(optional)

``` shell
    cp config-example.json config.json
  ```

see [configuration](#configuration)

## Start

### Services

Services can be started manually one by one, but we recommend to use [PM2](https://github.com/Unitech/pm2).
This repo includes a pm2 ecosystem file that starts all services automatically.

#### Install PM2

``` shell
  npm install -g pm2
```

To enable pm2 log rotation

``` shell
  pm2 install pm2-logrotate
```

see [pm2-logrotate](https://pm2.keymetrics.io/docs/usage/log-management/#pm2-logrotate-module)
see [pm2-logrotate configuration](https://github.com/keymetrics/pm2-logrotate#configure) to set the rotation options

e.g:

```shell

pm2 set pm2-logrotate:compress true

```

#### Start services

```shell
pm2 start dist/services/blocks.config.js
```

### API

``` shell
  pm2 start dist/api/api.config.js
```

## Show PM2 logs in pretty format

All tasks

```shell

:~/rsk-explorer-api$ pm2 log --raw | npx bunyan

```

One task

```shell

:~/rsk-explorer-api$ pm2 log blocksListener --raw | npx bunyan

```

## Commands

Run api in development mode

``` shell
    npm run dev
  ```

Run blocks service in development mode

``` shell
    npm run blocks
  ```

Production build to ./dist folder

``` shell
    npm run build
  ```

## Configuration
  
  **config.json**
  See defaults on: **lib/defaultConfig**
  *(config.json overrides this values)*

  Use:
  
  ```shell
  node dist/tools/showConfig.js
  ```

  to check current configuration
  
**Configuration Example:**

``` javascript
  "source": {
    "node": "localhost",
    "port": 4444
  },
  "api": {
    "address": "localhost",
    "port": 3003
  },
  "db": {
    "server": "localhost",
    "port": 27017,
    "database": "blockDB"
  }

  ```

The contractVerifier module requires a connection to a [rsk-contract-verifier](https://github.com/rsksmart/rsk-contract-verifier)
instance. The url must be provided on api section:

```javascript
"api":{
  "contractVerifier": {
      "url": "ws://localhost:3008"
    }
}

```

### Source

  Address of rskj node or array of addresses of rskj nodes

e.g.:

```json
{
  "url":"http://localhost:4444"
}

```

e.g:

```json
[
  { "url":"http://localhost:4444" },
  { "url":"http://othernode:4444" }
]

```

### db

  **server**": "localhost"
  **port**": 27017
  **database**: "explorerDB"

**Optionals:**

  **user**: < user >
  **password**: < password >

### blocks
  
  **validateCollections** :[Boolean] Validate collections at blocks service start, default false
  **blocksQueueSize**:[Number] blocksRequester queue size
  **bcTipSize**:[Number] Number of confirmations required to check blocks
  **debug**:[Boolean] Enable logging of nod3 requests, default false

### api

  **address** [string] api server bind address
  **port**  [number] api server port

  **allowUserEvents** [boolean]: enable/disable userEventsApi
  **exposeDoc** [boolean]: serve rsk-openapi-ui on /doc to render swagger.json

## Documentation
  
- [api documentation](doc/api.md)
- [open api specification](public/swagger.json)

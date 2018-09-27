# Rsk explorer api

## Description

## Components

### api

### blocks service


## Requisites

- mongodb > 4
- node > 8

## Install

- Install dependecies

``` shell
    npm install
  ```

- Create configuration file

``` shell
    cp config-example.json config.json
  ```

- Check database configuration.

## Start

### services

``` shell
  node dist/services/blocks
```

### api

``` shell
  node dist/api
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

  See defaults on: **lib/defaultConfig**
  *(config.json overrides this values)*

  Use dist/tools/showConfig to check values
  
Required values

``` javascript
   "source": {
    "node": "localhost",
    "port": 4444
  },
  "publicSettings": {
    "bridgeAddress": "0x0000000000000000000000000000000001000006",
    "remascAddress": "0x0000000000000000000000000000000001000008"
  },
  "server": {
    "port": 3003
  },
  "db": {
    "server": "localhost",
    "port": 27017,
    "database": "blockDB"
  }

```

### Source

  **node**: "localhost",
  **port**: 4444

### db

  **server**": "localhost"
  **port**": 27017
  **database**: "explorerDB"

**Optionals:**

  **user**: < user >
  **password**: < password >

### blocks
  
  **validateCollections** :[Boolean] Validate collectios at blocks service start
  **blocksQueueSize**:[Number]
  **bcTipSize**:[Number] BC tip size

### api

  **allowUserEvents** [Boolean]: enable/disable userEventsApi


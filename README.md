# Rsk explorer api

## Description


## Components

### api

### blocks service

### erc20 service

## Requisites

- mongodb > 3.2
- node > 8

## Install

Install dependecies

``` shell
    npm install
  ```

Create configuration file

``` shell
    cp config.json.example config.json
  ```
Check database configuration, and create the database.


**Then start:** 

**services**

``` shell
  node dist/services/blocks
  node dist/services/erc20
```

**api**

``` shell
  node dist/api.js
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

Run erc20 service in development mode

``` shell
    npm run erc20
  ```

  Production build to ./dist folder

``` shell
    npm run build
  ```

## Configuration

  See defaults on: **lib/defaultConfig** 
  *(config.json overrides this values)*


### Source

  "node": "localhost",
  "port": 4444

### db

  "server": "localhost"
  "port": 27017
  "database": "explorerDB"

**Optionals:**

  "user": < user >
  "password": < password >

### blocks

### erc20

- ABI
- tokens: Array of token objects:
    ``` javascript
    {
      shortName: '<token-short-name>',
      address: '<token-address>',
      decimals: 18,
      name: '<token-name>',
      description: '<token-description>',
      totalSupply: -1,
    }


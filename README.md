# Rsk explorer api

## Description


## Components

### api

### blocks

### erc20

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

  See defaults on: **lib/defaultConfig** *(config.json overrides this values)*


### Source

### db

### blocks

### erc20

- ABI
- tokens: Array of token objects:
    ``` javascript
    {
      shortName: 'GNT',
      address: '0xa74476443119a942de498590fe1f2454d7d4ac0d',
      decimals: 18,
      name: 'Golem Network Token',
      description: 'Golem Network Token',
      totalSupply: -1,
    }


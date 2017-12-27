# Rsk explorer api

## Requisites
  - mongodb > 3
- - node >8
## Install

  Install dependecies
  ```
    npm install
  
  ```
  Run in development mode
  ```
    npm run dev
  ```
  Production build to ./dist folder
  
  ```
    npm run build
  ```
  

## Config
  
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


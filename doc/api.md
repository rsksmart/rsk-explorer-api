
# rsk-explorer API

The explorer API supports WS and HTTP connections.
Requests over WS are performed sending a data event with payload object.
To use HTTP, make a GET request with the same payload as query.

Example:

To request a block by number over WS:

```javascript

const payload = {
    module: 'blocks',
    action: 'getBlock',
    params: {
      number: 513216
    }
  }

socket.emit('data',payload)

```

Same request over HTTP:

http://localhost:3003/api?module=blocks&action=getBlock&number=200

Response:

```json
{
  "prev": {
    "_id": "5cc32f1b5504ec3ce0f4c930",
    "number": 513214
  },
  "data": {
    "_id": "5cc32f1f5504ec3ce0f4c935",
    "number": 513215,
    "hash": "0x5ac55db846e0df71c47cc1909ae1f8122cc8c9cd42885b91a241562fcebcacbd",
    "parentHash": "0xe407ef06e5cff209e53804e929945ac08c86b4fe356f3000f7ec7845f059b703",
    "sha3Uncles": "0xa8032a3a04ba3ca63035dd50e6d6da32c2125a5d2564f5204715a013bae334e6",
    "logsBloom": "0x00000008000000800000000000000000000000000000000000000000000008000000000000040000000000000000000050000000000000000000000000000000000000000000000000000000005000000010008000000000100000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000200000000000200000000000001040000000000000400000000000000000000100000000000000010000000000000000000001000000000000001000001000000000000000000000000000020000000000080200000100000000000000000000000000000000000000000080000000000000000000000000000",
    "transactionsRoot": "0x1df176239354622d8fd87750ee909682eb9d5391fe6d49efe8eeec9094f9b4ad",
    "stateRoot": "0x14fed18b2065d4e2e5cca04e0c7d033dfb4544acc7e71fc6d7ce1ab2326abda6",
    "receiptsRoot": "0x2fdd1465115924ca331cf485640b7a61a7015a5347b653fbc36db3342a2d763b",
    "miner": "0x1fab9a0e24ffc209b01faa5a61ad4366982d0b7f",
    "difficulty": "0x202283bd",
    "totalDifficulty": "0x35285acb65ca047b",
    "extraData": "0x00",
    "size": 4542,
    "gasLimit": 6800000,
    "gasUsed": 0,
    "timestamp": 1556294390,
    "transactions": [
      "0xd00f01b3f7543cac4969eeb8e068788cb8ec8477735e4a795e69f79248c7b6b5"
    ],
    "uncles": [
      "0x058abf372ff4d08a94c2d8e153e706f21ecd85ea96d6b3cc3833b321935537f4",
      "0x8c2e866e93fc89abe9c3616f14dd6bffdd8157a6987ac6ff763a82753b6d832f",
      "0x9bc1429f2e843de6b5df110bc647876f00607007d38f667b3c44dee25457516c",
      "0x619e1414064886eaa87d0ddb0e9cea0171d5118d8e75b0e3b85565539a15f06b"
    ],
    "minimumGasPrice": "0",
    "_received": 1556295441392
  },
  "next": {
    "_id": "5cc32f245504ec3ce0f4c964",
    "number": 513216
  }
}
```

## Request object

```javascript
{
  module:<String>
  action:<String>
  params:<Object>
}
```

A detailed **request object** definition can be found under **definitions/Request** in [swagger.json](/public/swagger.json)

### The response objects

#### Single item response

```javascript
{
  module:'', //module name
  channel:'', // channel name
  action:'', // action name
  data:{}, // data object
  next:{}, // in some entities provides data to request next element
  prev:{},// in some entities provides data to request next element
  req:{}, // requested payload
}
```

A detailed **single response object** definition can be found under **definitions/Response** in [swagger.json](/public/swagger.json)

#### List response

```javascript
{
  module:'', //module name
  channel:'', // channel name
  action:'', // action name
  data:[], // data array
  req:{}, // requested payload
}
```

A detailed **list response object** definition can be found under **definitions/ResponseList** in [swagger.json](/public/swagger.json)

### Pagination

The results of queries that produce multiple results are paginated with cursors.
To request the next list elements, you must use the pagination data provided in the first response.

Example, get blocks list:

```shell

curl -X GET  'http://localhost:3003/api?module=blocks&action=getBlocks'

```

```json
{
  "pages": {
    "sort": {
      "number": -1
    },
    "sortable": {
      "timestamp": -1,
      "number": -1
    },
    "defaultSort": {
      "number": -1
    },
    "sortDir": -1,
    "limit": 50,
    "next": 513208,
    "prev": null,
    "fields": {}
  },
  "data": [] // blocks data
  }

```

Use 'next' value to request the next list items:

```shell

curl -X GET  'http://localhost:3003/api?module=blocks&action=getBlocks&next=513208'

```

```json
{
  "pages": {
    "sort": {
      "number": -1
    },
    "sortable": {
      "timestamp": -1,
      "number": -1
    },
    "defaultSort": {
      "number": -1
    },
    "sortDir": -1,
    "limit": 50,
    "next": 513158,
    "prev": 513207,
    "fields": {}
  },
```

To clarify the use of the websocket server and the pagination syntax, take a look at: [src/tools/wsGet.js](src/tools/wsGet.js)

### Websocket channels

The websocket API has channels that notify when new data arrives.

#### Payload to  subscribe to a channel

```javascript
// request
{
  event:'subscribe',
  {to:<channel-name>}}

// response
{
  event:'subscription'
  channel: <channel-name>
}
```

**socket-io client example:**

```javascript

import io from 'socket.io-client'
const url = 'ws://localhost:3003'
const socket = io.connect(url, { reconnect: true })
const blocksChannel = 'blocks'

socket.on('connect', () => {
  console.log('connected!')
  socket.emit('subscribe', { to: blocksChannel })
})

socket.on('subscription', res => {
  console.log(`Subscription to ${res.channel} was successfully`)
})

socket.on('data', res => {
  const { channel, action, data } = res
  if (channel === blocksChannel) {
    const { blocks } = data
    console.log(channel, action, blocks.map(block => `${block.number} / ${block.hash}`))
  }
})

```

### Channels

#### blocks

Notifies when new blocks arrives

##### blocks channel events

- **data:** sends last known data, issued once on subscription
- **newBlocks:** new blocks data

#### status

Provides explorer database and node status

##### status channel events

- **data:** sends last known data, issued once on subscription
- **dbStatus:** emits status data

#### txPool

Provides pending and queued transactions data

##### txPool channel events

- **data:** sends last known data, issued once on subscription
- **txPool:** tx pool data
- **txPoolChart:** tx pool historical data for charts

#### stats (experimental)

Provides network stats data

##### stats channel events

- **data:** sends last known data, issued once on subscription
- **stats:** new stats data

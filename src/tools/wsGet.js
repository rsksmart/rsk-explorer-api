import io from 'socket.io-client'
import * as c from '../lib/cli'
import fs from 'fs'
import crypto from 'crypto'
import * as URL from 'url'
import pkg from '../../package.json'

const url = process.env.url || 'ws://localhost:3003'
if (process.argv[2] === '--help') help()
const outDir = process.env.outDir || '/tmp'

let payload = process.env.payload || process.argv[2]

if (!isValidURL(url) || !payload) help()
payload = JSON.parse(payload)
if (!payload.module || !payload.action || !payload.params) help()

const destinationFile = getDestinationFile(payload)
const file = createFileStream(destinationFile)

const socket = io.connect(url, { reconnect: true })
let results = 0
const key = createRequestKey(payload)
payload.key = key

c.info(`Waiting for WS on ${url}`)

socket.on('connect', data => {
  c.ok('Connected! ✌')
  c.info(`sending payload`)
  getPage(socket, payload)
})

socket.on('disconnect', socket => {
  c.warn('Disconnected ☹')
})

socket.on('data', async res => {
  try {
    let { data, error, req } = res
    if (error) {
      c.error(error)
      process.exit()
    }
    if (!error && req && key === req.key) {
      // multiple results
      if (res.pages) {
        let { prev, next, total, limit } = res.pages
        if (!prev) c.info(`Total ${total}`)

        c.info(`Adding ${data.length}`)

        // send data to file stream
        await addDataToFile(data)

        if (!payload.limit) payload.limit = limit

        if (next) {
          getPage(socket, payload, next)
        } else {
          await closeFileAndExit()
        }
      } else { // single result
        c.ok('Saving to file')
        await addDataToFile(data)
        await closeFileAndExit()
      }
    }
  } catch (err) {
    c.error(err)
    process.exit(9)
  }
})

socket.on('Error', err => {
  let error = err.error || ''
  c.error(`ERROR: ${error}`)
  c.warn(err)
})

process.on('unhandledRejection', err => {
  console.error(err)
  process.exit(9)
})

function getDestinationFile (payload, count = 0) {
  count = count || 0
  let { module, action } = payload
  let suffix = (count) ? `-${count}` : ''
  let fileName = `${module}-${action}${suffix}.json`
  let dest = `${outDir}/${fileName}`
  if (fs.existsSync(dest)) return getDestinationFile(payload, count + 1)
  return dest
}

async function addDataToFile (data) {
  try {
    let items = await file.put(data)
    results += items
  } catch (err) {
    return Promise.reject(err)
  }
}

async function closeFileAndExit () {
  try {
    await file.close()
    c.ok(`Done: ${results} results`)
    c.info(`File saved: ${destinationFile}`)
    process.exit(0)
  } catch (err) {
    c.error(err)
    process.exit(9)
  }
}

function getPage (socket, payload, next) {
  let params = payload.params || {}
  let { limit } = params
  let count = false
  limit = limit || ''
  if (!next) {
    count = true
    if (params.next) next = params.next
    c.ok(`Getting first ${limit} items`)
  } else {
    c.ok(`Getting next ${limit} items: ${next}`)
  }
  payload = Object.assign({}, payload)
  payload.params = payload.params || {}
  payload.params.next = next
  payload.params.count = count
  socket.emit('data', payload)
}

function help () {
  let { name } = pkg
  if (!isValidURL(url)) c.warn(`Invalid URL: ${url}`)
  // if (!payload) c.warn(`Set environment variable payload, e.g. payload='{"module":"blocks","action":"getBlock","params":{"hashOrNumber":200}}'`)
  c.ok('')
  c.ok(`Usage:`)
  c.info('')
  c.info('All parameters must be provided as environment variables')

  c.info('')
  c.info('Required parameters:')
  c.info('')
  c.example(`     url: ${name} instance URL`)
  c.example(`     payload: ${name} payload`)
  c.info('')
  c.info('Optionals parameters:')
  c.info('')
  c.example(`     outDir: destination folder`)
  c.info('')
  c.ok('Examples:')
  c.example('')
  c.info('Get block')
  c.example(`    export url=wss://backend.explorer.rsk.co`)
  c.example(`    export payload='{"module":"blocks","action":"getBlock","params":{"hashOrNumber":200}}'`)
  c.example('')
  c.info('Get blocks')
  c.example(`    export url=wss://backend.explorer.rsk.co`)
  c.example(`    export payload='{"module":"blocks","action":"getBlocks","params":{"next":200,"sort":{"number":-1}}}'`)
  c.example('')
  process.exit(0)
}

function createFileStream (destinationFile) {
  const file = fs.createWriteStream(destinationFile)
  const addLineToFile = (data) => {
    return new Promise((resolve, reject) => {
      let line = JSON.stringify(data) + '\n'
      const errorListener = () => reject(new Error('Error adding line to file'))
      // use addListener instead of 'on' to remove event later, and prevent memory leaks
      file.addListener('error', errorListener)
      file.write(line, () => resolve())
      file.removeListener('error', errorListener)
    })
  }

  const put = async (data) => {
    try {
      if (!Array.isArray(data)) data = [data]
      for (let d of data) {
        await addLineToFile(d)
      }
      return data.length
    } catch (err) {
      return Promise.reject(err)
    }
  }
  const close = () => {
    return new Promise((resolve, reject) => {
      file.end(() => resolve())
      file.on('error', err => {
        reject(err)
      })
    })
  }
  return Object.freeze({ put, close })
}

function createRequestKey ({ action, module }) {
  let rnd = crypto.randomBytes(8).toString('hex')
  return `${module} - ${action} - ${rnd}`
}

function isValidURL (url) {
  try {
    let { protocol } = URL.parse(url)
    return /^ws/.test(protocol)
  } catch (err) {
    c.error(err)
    return false
  }
}

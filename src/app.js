import express from 'express'
import path from 'path'
import http from 'http'
import SocketIO from 'socket.io'
import config from '../config.json'

const app = express()
const port = config.port || '3000'
const server = http.Server(app)
const io = new SocketIO(server)

// app.use('/', express.static(path.join(__dirname, '../static')))
// app.use('/css', express.static(path.join(__dirname, '../dist/css')))

// app.locals.title = 'RSK erc20 explorer'
// app.locals.config = config

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handler
app.use((err, req, res, next) => {  
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.send('error')
})

server.listen(port, () => {
  console.log('Listening on port ' + port)
})

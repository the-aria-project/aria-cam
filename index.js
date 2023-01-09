const os = require('os')
const http = require('http')
const path = require('path')
const socketIO = require('socket.io')
const socketIOClient = require('socket.io-client')
const express = require('express')
const RaspividJpegStream = require('raspivid-jpeg-stream')

const app = express()
const server = http.Server(app)
const io = socketIO(server)
const config = require('./config.json')

let clients = []
let servers = []
const startTime = new Date()
let serverConnects = 0
let serverDisconnects = 0
let clientConnects = 0
let clientDisconnects = 0

const camera = new RaspividJpegStream({
  width: config.camera.width,
  height: config.camera.height,
  timeout: 0,
  framerate: config.camera.framerate
})

const frameHandler = frame => {
  const mimeType = 'image/jpg'
  const b64Buffer = Buffer.from(frame).toString('base64')

  // Emit event to clients
  clients.forEach(socket => {
    if (socket) {
      socket.emit('camera:frame', { mimeType, buffer: b64Buffer })
    }
  })

  // Emit event to servers
  servers.forEach(socket => {
    if (socket) {
      socket.emit('camera:frame', { mimeType, buffer: b64Buffer })
    }
  })
  
}

camera.on('data', frameHandler)

// Clients
io.on('connection', socket => {
  clientConnects++
  console.log(`${socket.id} connected`)
  clients.push(socket)

  socket.on('disconnect', socket => {
    clientDisconnects++
    console.log(`${socket.id} disconnected`)
    clients = clients.filter(s => s.id !== socket.id)
  })
  
})

// Servers
config.destinations.forEach(dest => {
  const socket = socketIOClient(`${dest.ssl ? 'https' : 'http'}://${dest.host}:${dest.port}`)

  socket.on('connect', () => {
    serverConnects++
    console.log(`[${socket.id}] Connected to ${dest.host}`)
    servers.push(socket)
  })

  socket.on('disconnect', () => {
    serverDisconnects++
    console.log(`[${socket.id}] Disconnected from ${dest.host}`)
    servers = servers.filter(s => s.id !== socket.id)
  })
  
})

app.get(config.server['live_view_path'], (req, res) => {
  res.sendFile(path.resolve(__dirname, 'live-view.html'))
})

app.get('/health-check', (req, res) => {
  // Return camera details and health
  res.send({
    camera: config.camera,
    up_time: new Date().getTime() - startTime.getTime(),
    connections: {
      clients: {
        connects: clientConnects,
        disconnects: clientDisconnects,
      },
      servers: {
        connects: serverConnects,
        disconnects: serverDisconnects
      }
    }
  })
})

server.listen(config.server.port, () => {
  console.log(`Camera server running on port ${config.server.port}`)
  console.log(`View your camera live at http://${os.hostname()}${[8080, 80].includes(config.server.port) ? config.server.live_view_path : `:${config.server.port}${config.server.live_view_path}`}`)

  console.log(`Camera Config: ${config.camera.width}x${config.camera.height}@${config.camera.framerate}fps`)
  console.log(`\n__Configured detinations__`)
  config.destinations.forEach(dest => {
    console.log(`${dest.ssl ? 'https' : 'http'}://${dest.host}:${dest.port}`)
  })
})

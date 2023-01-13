import fs from 'fs'
import os from 'os'
import path from 'path'
import express, { Request, Response } from 'express'
import socketIO, { Socket as ServerSocket } from 'socket.io'
import socketIOClient, { Socket as ClientSocket } from 'socket.io-client'
import http from 'http'
import { ConfigDestination } from 'aria-types'
import Camera from './Camera'
import { Config } from './types'

const app = express()
const server = new http.Server(app)
const io = new socketIO.Server(server)
const config: Config = require('../config.json')

// State
let clients: ServerSocket[] = []
let servers: ClientSocket[] = []
const startTime: Date = new Date()
let serverConnects: number = 0
let serverDisconnects: number = 0
let clientConnects: number = 0
let clientDisconnects: number = 0

const camera = new Camera({
  width: config.camera.width,
  height: config.camera.height,
  timeout: 0,
  framerate: config.camera.framerate
})

const frameHandler = (frame: Buffer) => {
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

// Start camera and set up frame handler for data events
camera.start()
camera.on('data', frameHandler)

// Restart camera to preserve memory every x ms
setInterval(() => {
  console.log('Rebooting camera')
  camera.off('data', frameHandler)
  camera.stop()
  camera.start()
  camera.on('data', frameHandler)
}, config.camera.reset_interval)

// Clients
io.on('connection', (socket: ServerSocket) => {
  clientConnects++
  console.log(`${socket.id} connected`)
  clients.push(socket)

  socket.on('disconnect', () => {
    clientDisconnects++
    console.log(`${socket.id} disconnected`)
    clients = clients.filter(s => s.id !== socket.id)
  })
  
})

// Servers
config.destinations.forEach((dest: ConfigDestination) => {
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

// Endpoints
app.get(config.server['live_view_path'], (req: Request, res: Response) => {
  res.sendFile(path.resolve(__dirname, 'live-view.html'))
})

app.get('/health-check', (req: Request, res: Response) => {
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

// Start server
server.listen(config.server.port, () => {
  console.log(`Camera server running on port ${config.server.port}`)
  console.log(`View your camera live at http://${os.hostname()}${[8080, 80].includes(config.server.port) ? config.server.live_view_path : `:${config.server.port}${config.server.live_view_path}`}`)

  console.log(`Camera Config: ${config.camera.width}x${config.camera.height}@${config.camera.framerate}fps`)
  console.log(`\n__Configured detinations__`)
  config.destinations.forEach((dest: ConfigDestination) => {
    console.log(`${dest.ssl ? 'https' : 'http'}://${dest.host}:${dest.port}`)
  })
})

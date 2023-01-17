import os from 'os'
import path from 'path'
import express, { Request, Response } from 'express'
import socketIO, { Socket as ServerSocket } from 'socket.io'
import socketIOClient, { Socket as ClientSocket } from 'socket.io-client'
import http from 'http'
import { socketEvents } from 'aria-lib'
import { ConfigDestination, CameraFrame } from 'aria-lib/lib/types'
import Camera from './Camera'
import devLog from './lib/devLog'
import config from '../config.json'
import { Worker, workerData } from 'worker_threads'

const app = express()
const server = new http.Server(app)
const io = new socketIO.Server(server)
const hostname = os.hostname()

// State
let clients: ServerSocket[] = []
let servers: ClientSocket[] = []
const startTime: Date = new Date()
let serverConnects = 0
let serverDisconnects = 0
let clientConnects = 0
let clientDisconnects = 0

// const camera = new Camera({
//   width: config.camera.width,
//   height: config.camera.height,
//   timeout: 0,
//   framerate: config.camera.framerate,
// })

const frameHandler = (frame: Buffer) => {
  const cameraFrame: CameraFrame = {
    mimeType: 'image/jpg',
    buffer: Buffer.from(frame).toString('base64'),
    timestamp: new Date().getTime(),
    camera: {
      width: config.camera.width,
      height: config.camera.height,
      fps: config.camera.framerate,
      host: hostname,
      friendly_name: config.camera_friendly_name,
    },
  }

  // Emit event to clients
  clients.forEach(socket => {
    if (socket) {
      socket.emit(socketEvents.camera.frame, cameraFrame)
    }
  })

  // Emit event to servers
  servers.forEach(socket => {
    if (socket) {
      socket.emit(socketEvents.camera.frame, cameraFrame)
    }
  })
}

// Start camera and set up frame handler for data events
// camera.start()
// camera.on('data', frameHandler)
const videoThread = new Worker(path.join(__dirname, '../workers/raspivid-worker.js'), {
  workerData: {
    width: config.camera.width,
    height: config.camera.height,
    timeout: 0,
    framerate: config.camera.framerate,
  }
})

videoThread.on('message', frameHandler)

// Restart camera to preserve memory every x ms
setInterval(() => {
  // devLog('Rebooting camera')
  // camera.off('data', frameHandler)
  // camera.on('data', frameHandler)
}, config.camera.reset_interval)

// Clients
io.on('connection', (socket: ServerSocket) => {
  clientConnects++
  devLog(`${socket.id} connected`)
  clients.push(socket)

  socket.on('disconnect', () => {
    clientDisconnects++
    devLog(`${socket.id} disconnected`)
    clients = clients.filter(s => s.id !== socket.id)
  })
})

// Servers
config.frame_destinations.forEach((dest: ConfigDestination) => {
  const socket = socketIOClient(
    `${dest.ssl ? 'https' : 'http'}://${dest.host}:${dest.port}`
  )

  socket.on('connect', () => {
    serverConnects++
    devLog(`[${socket.id}] Connected to ${dest.host}`)
    servers.push(socket)
  })

  socket.on('disconnect', () => {
    serverDisconnects++
    devLog(`[${socket.id}] Disconnected from ${dest.host}`)
    servers = servers.filter(s => s.id !== socket.id)
  })
})

// Endpoints
app.get('/live', (req: Request, res: Response) => {
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
        disconnects: serverDisconnects,
      },
    },
  })
})

// Start server
server.listen(config.server_port, () => {
  devLog(`Camera server running on port ${config.server_port}`)
  devLog(
    `View your camera live at http://${os.hostname()}${
      [8080, 80].includes(config.server_port)
        ? '/live'
        : `:${config.server_port}/live`
    }`
  )

  devLog(
    `Camera Config: ${config.camera.width}x${config.camera.height}@${config.camera.framerate}fps`
  )
  devLog(`\n__Configured detinations__`)
  config.frame_destinations.forEach((dest: ConfigDestination) => {
    devLog(`${dest.ssl ? 'https' : 'http'}://${dest.host}:${dest.port}`)
  })
})

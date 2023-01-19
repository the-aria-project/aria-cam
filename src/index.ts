import os from 'os'
import path from 'path'
import express, { Request, Response } from 'express'
import socketIO, { Socket as ServerSocket } from 'socket.io'
import socketIOClient, { Socket as ClientSocket } from 'socket.io-client'
import http from 'http'
import { Worker } from 'worker_threads'
import { ConfigDestination, CameraFrame } from 'aria-lib/lib/types'
import { socketEvents } from 'aria-lib'
import devLog from './lib/devLog'
import config from '../config.json'

const hostname = os.hostname()

// Objects
const app = express()
const server = new http.Server(app)
const io = new socketIO.Server(server)

// State
let readyToProcessVideo = false
let clients: ServerSocket[] = []
const currentStream: Buffer[] = []

// Workers
let videoStreamWorker: Worker = new Worker(path.join(__dirname, '../workers/raspivid-worker.js'), {
  workerData: {
    width: config.camera.width,
    height: config.camera.height,
    timeout: 0,
    framerate: config.camera.framerate
  }
})

// Methods
const sendImageToBrain = (cameraFrame: CameraFrame) => {
  
}

const broadcastToHub = (cameraFrame: CameraFrame) => {

}

const sendVideoToStorage = (chunks: Buffer[]) => {
  console.log('Processing Video')
}

const onFrame = (chunk: Buffer) => {
  const cameraFrame: CameraFrame = {
    mimeType: 'image/jpg',
    buffer: Buffer.from(chunk).toString('base64'),
    timestamp: new Date().getTime(),
    camera: {
      width: config.camera.width,
      height: config.camera.height,
      fps: config.camera.framerate,
      host: hostname,
      friendly_name: config.camera_friendly_name,
    },
  }

  if (config.use_live_view) {
    clients.forEach(socket => {
      if (socket) {
        socket.emit(socketEvents.camera.frame, cameraFrame)
      }
    })
  }

  if (config.aria_services.use_video_storage) {
    currentStream.push(chunk)

    if (readyToProcessVideo) {
      readyToProcessVideo = false
      sendVideoToStorage(currentStream)
    }
  }
}

// Application
if (config.aria_services.use_video_storage) {
  setInterval(() => {
    readyToProcessVideo = true
  }, 60000)
}

videoStreamWorker.on('message', onFrame)

// Clients
io.on('connection', (socket: ServerSocket) => {
  devLog(`${socket.id} connected`)
  clients.push(socket)

  socket.on('disconnect', () => {
    devLog(`${socket.id} disconnected`)
    clients = clients.filter(s => s.id !== socket.id)
  })
})

// Endpoints
if (config.use_live_view) {
  app.get('/live', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'live-view.html'))
  })
}

// Start server
server.listen(config.server_port, () => {
  devLog(`Camera server running on port ${config.server_port}`)
  if (config.use_live_view) {
    devLog(
      `View your camera live at http://${os.hostname()}${[8080, 80].includes(config.server_port)
        ? '/live'
        : `:${config.server_port}/live`
      }`
    )
  }

  devLog(
    `Camera Config: ${config.camera.width}x${config.camera.height}@${config.camera.framerate}fps`
  )
})

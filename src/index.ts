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

import { DetectedObject } from '@tensorflow-models/coco-ssd'
// import frameHandler from './lib/frameHandler'

const hostname = os.hostname()

// Objects
const app = express()
const server = new http.Server(app)
const io = new socketIO.Server(server)

// State
let clients: ServerSocket[] = []
let servers: ClientSocket[] = []
let isReadyForPrediction = false

// Workers
let detectionWorker: Worker = new Worker(path.join(__dirname, '../workers/predict-object.js'))
let videoStreamWorker: Worker = new Worker(path.join(__dirname, '../workers/raspivid-worker.js'), {
  workerData: {
    width: config.camera.width,
    height: config.camera.height,
    timeout: 0,
    framerate: config.camera.framerate
  }
})

const runDetectionJob = (chunk: Buffer) => {
  isReadyForPrediction = false
  detectionWorker.postMessage(Buffer.from(chunk).toString('base64'))
}

type VideoStreamWorkerData = 'model-ready' | {
  time: number,
  predictions: DetectedObject[]
}

detectionWorker.on('message', (data: VideoStreamWorkerData) => {
  if (data === 'model-ready') {
    isReadyForPrediction = true
  } else {
    isReadyForPrediction = true
    console.log(data)
  }
})

videoStreamWorker.on('message', async (chunk: Buffer) => {
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

  if (isReadyForPrediction) {
    runDetectionJob(chunk)
  }

})

// Clients
io.on('connection', (socket: ServerSocket) => {
  devLog(`${socket.id} connected`)
  clients.push(socket)

  socket.on('disconnect', () => {
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
    devLog(`[${socket.id}] Connected to ${dest.host}`)
    servers.push(socket)
  })

  socket.on('disconnect', () => {
    devLog(`[${socket.id}] Disconnected from ${dest.host}`)
    servers = servers.filter(s => s.id !== socket.id)
  })
})

// Endpoints
app.get('/live', (req: Request, res: Response) => {
  res.sendFile(path.resolve(__dirname, 'live-view.html'))
})

// Start server
server.listen(config.server_port, () => {
  devLog(`Camera server running on port ${config.server_port}`)
  devLog(
    `View your camera live at http://${os.hostname()}${[8080, 80].includes(config.server_port)
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

import os from 'os'
import path from 'path'
import express, { Request, Response } from 'express'
import socketIO, { Socket as ServerSocket } from 'socket.io'
import socketIOClient, { Socket as ClientSocket } from 'socket.io-client'
import http from 'http'
import { Worker } from 'worker_threads'
import cocoSsd from '@tensorflow-models/coco-ssd'
import { ConfigDestination, CameraFrame } from 'aria-lib/lib/types'
import devLog from './lib/devLog'
import config from '../config.json'
import frameHandler from './lib/frameHandler'

const hostname = os.hostname()

// Objects
let model
const app = express()
const server = new http.Server(app)
const io = new socketIO.Server(server)

// State
let clients: ServerSocket[] = []
let servers: ClientSocket[] = []
const startTime: Date = new Date()
let serverConnects = 0
let serverDisconnects = 0
let clientConnects = 0
let clientDisconnects = 0

// Workers
let videoFrameWorker: Worker
let predictionWorker: Worker

const _init = async () => {
  try {
    model = await cocoSsd.load({ base: 'mobilenet_v2' })

    videoFrameWorker = new Worker(path.join(__dirname, '../workers/raspivid-worker.js'), {
      workerData: {
        width: config.camera.width,
        height: config.camera.height,
        timeout: 0,
        framerate: config.camera.framerate,
      }
    })

    predictionWorker = new Worker(path.join(__dirname, '../workers/object-prediction-worker.js'), {
      workerData: {
        model
      }
    })

    videoFrameWorker.on('message', (chunk: Buffer) => {
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

      predictionWorker.postMessage(cameraFrame)
    })

    predictionWorker.on('message', (newCameraFrame: CameraFrame) => {
      console.log(newCameraFrame.predictions)
    })

  } catch (err) {
    throw err
  }
}

_init()
  .then(() => {
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
  })
  .catch(err => {
    devLog(err)
    process.exit(1)
  })

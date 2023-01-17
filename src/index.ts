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

require('@tensorflow/tfjs-backend-cpu')
const cocoSsd = require('@tensorflow-models/coco-ssd')
const tf = require('@tensorflow/tfjs-node')
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
const startTime: Date = new Date()
let serverConnects = 0
let serverDisconnects = 0
let clientConnects = 0
let clientDisconnects = 0
let isReadyForPrediction = true
let predictionTimer = null

// Workers
let videoFrameWorker: Worker
let predictionWorker: Worker

const _init = async () => {
  try {
    console.log('Loading model...')
    const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
    console.log('Model loaded!')

    predictionTimer = setInterval(async () => {
      isReadyForPrediction = false
    }, 2000)

    videoFrameWorker = new Worker(path.join(__dirname, '../workers/raspivid-worker.js'), {
      workerData: {
        width: config.camera.width,
        height: config.camera.height,
        timeout: 0,
        framerate: config.camera.framerate
      }
    })

    videoFrameWorker.on('message', async (chunk: Buffer) => {
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

      if (isReadyForPrediction) {
        console.log('Making prediction')
        isReadyForPrediction = false
        const imageData = tf.node.decodeImage(Buffer.from(cameraFrame.buffer.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64'))
        const detection = await model.detect(
          imageData,
          config.object_detection_options.max_objects,
          config.object_detection_options.sensitivity
        )
        cameraFrame.predictions = detection
        console.log('Done')
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

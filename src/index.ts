import os from 'os'
import fs from 'fs'
import path from 'path'
import express, { Request, Response } from 'express'
import socketIO, { Socket as ServerSocket } from 'socket.io'
import socketIOClient, { Socket as ClientSocket } from 'socket.io-client'
import http from 'http'
import { Worker } from 'worker_threads'
import { ConfigDestination, CameraFrame } from 'aria-lib/lib/types'
import { socketEvents } from 'aria-lib'
import Camera from './Camera'
import devLog from './lib/devLog'
import config from '../config.json'

const isDev = process.env.NODE_ENV === 'development'

const hostname = os.hostname()

// Objects
const app = express()
const server = new http.Server(app)
const io = new socketIO.Server(server)

// State
let readyToProcessVideo = false
let clients: ServerSocket[] = []
let currentStream: Buffer[] = []

// Workers
// let videoStreamWorker: Worker = new Worker(path.join(__dirname, '../workers/raspivid-worker.js'), {
//   workerData: {
//     width: config.camera.width,
//     height: config.camera.height,
//     timeout: 0,
//     framerate: config.camera.framerate
//   }
// })

// Methods
const sendImageToBrain = (cameraFrame: CameraFrame) => {

}

const broadcastToHub = (cameraFrame: CameraFrame) => {

}

// const sendVideoToStorage = async () => {
//   readyToProcessVideo = false
//   console.log(`Processing ${currentStream.length} chunks`)
//   const stream = [...currentStream]
//   currentStream = []

//   const videoBuffer = Buffer.from(
//     stream
//       .map((b: Buffer) => Buffer.from(b).toString('base64').replace(/^data:image\/(png|jpeg);base64,/, ''))
//       .join(''), 'base64'
//   )
//   fs.promises.writeFile(path.join(__dirname, '../recordings/test.mp4'), videoBuffer)
// }

const camera = new Camera()

camera.onCameraFrame((cameraFrame: CameraFrame) => {
  if (config.use_live_view) {
    clients.forEach(socket => {
      if (socket) {
        socket.emit(socketEvents.camera.frame, cameraFrame)
      }
    })
  }
})

camera.start()
  .then(() => console.log('Camera Started'))
  .catch(err => console.log(err))

// Application
// if (config.aria_services.use_video_storage) {
//   if (!fs.existsSync(path.join(__dirname, '../recordings'))) {
//     fs.mkdirSync(path.join(__dirname, '../recordings'))
//   }

//   setInterval(() => {
//     readyToProcessVideo = true
//   }, 10000)
// }

// videoStreamWorker.on('message', onFrame)

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

app.get('/download', (req: Request, res: Response) => {
  const file = path.join(__dirname, '../recordings/test.mp4')
  res.download(file)
})

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

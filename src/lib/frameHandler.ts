import os from 'os'
import { Socket as ServerSocket } from "socket.io"
import { Socket as ClientSocket } from "socket.io-client"
import { ObjectDetection } from '@tensorflow-models/coco-ssd'
import { CameraFrame } from "aria-lib/lib/types"
import config from '../../config.json'

const hostname = os.hostname()

type FrameHandler = (
  frame: Buffer,
  clients: ServerSocket[],
  servers: ClientSocket[],
  model: ObjectDetection | null
) => void

const frameHandler: FrameHandler = (
  frame,
  clients,
  servers,
  model
) => {
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

export default frameHandler
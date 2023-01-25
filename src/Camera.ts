import fs from 'fs'
import os from 'os'
import { CameraFrame } from "aria-lib/lib/types"
import path from "path"
import { Worker } from "worker_threads"
import config from '../config.json'

const hostname = os.hostname()

type CameraConfig = {
  width: number
  height: number
  framerate: number
}

const defaultConfig = {
  width: config.camera.width,
  height: config.camera.height,
  framerate: config.camera.framerate
}

class Camera {
  friendlyName: string
  worker: Worker | null
  workerPath: string
  recordingPath: string
  config: CameraConfig
  onFrame: (cameraFrame: CameraFrame) => void
  shouldRecordVideo: boolean
  readyToProcessVideo: boolean
  videoProcessingTimer: NodeJS.Timer | null
  recordingLength: number
  recordedChunks: Buffer[]

  constructor() {
    this.friendlyName = config.camera_friendly_name
    this.worker = null
    this.workerPath = path.join(__dirname, '../workers/raspivid-worker.js')
    this.recordingPath = path.join(__dirname, '../recordings')
    this.config = defaultConfig
    this.onFrame = () => {}

    this.shouldRecordVideo = config.aria_services.use_video_storage
    this.readyToProcessVideo = false
    this.videoProcessingTimer = null
    this.recordingLength = 10000
    this.recordedChunks = []

    this.onWorkerFrame = this.onWorkerFrame.bind(this)
    this.stopWorker = this.stopWorker.bind(this)
    this.startWorker = this.startWorker.bind(this)
    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)
    this.onCameraFrame = this.onCameraFrame.bind(this)

    console.log(this.config)
  }

  onWorkerFrame(chunk: Buffer) {
    const cameraFrame: CameraFrame = {
      mimeType: 'image/jpg',
      buffer: Buffer.from(chunk).toString('base64'),
      timestamp: new Date().getTime(),
      camera: {
        width: this.config.width,
        height: this.config.height,
        fps: this.config.framerate,
        host: hostname,
        friendly_name: this.friendlyName
      }
    }

    this.onFrame(cameraFrame)

    if (this.shouldRecordVideo) {
      this.recordedChunks.push(chunk)

      if (this.readyToProcessVideo) {
        this.readyToProcessVideo = false
        console.log(`Processing ${this.recordedChunks.length} chunks`)
        this.recordedChunks = []
      }
      
    }
    
  }

  async stopWorker() {
    if (this.worker !== null) {
      this.worker.off('message', this.onWorkerFrame)
      await this.worker.terminate()
      this.worker = null
    }
  }

  async startWorker() {
    await this.stopWorker()

    this.worker = new Worker(this.workerPath, {
      workerData: {
        width: this.config.width,
        height: this.config.height,
        timeout: 0,
        framerate: this.config.framerate
      }
    })

    this.worker.on('message', this.onWorkerFrame)
  }

  async start() {
    await this.stop()
    await this.startWorker()

    if (this.shouldRecordVideo) {

      // Create recordings folder if one doesn't exist
      if (!fs.existsSync(this.recordingPath)) {
        fs.mkdirSync(this.recordingPath)
      }
      
      // Start Timer
      this.videoProcessingTimer = setInterval(() => {
        this.readyToProcessVideo = true
      }, this.recordingLength)
    }
    
  }

  async stop() {
    if (this.shouldRecordVideo) {
      this.readyToProcessVideo = false

      if (this.videoProcessingTimer !== null) {
        clearInterval(this.videoProcessingTimer)
        this.videoProcessingTimer = null
      }
      
    }

    await this.stopWorker()
  }

  onCameraFrame(frameHandler: (cameraFrame: CameraFrame) => void) {
    this.onFrame = frameHandler
  }
  
}

export default Camera

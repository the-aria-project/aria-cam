import SplitFrames from 'split-frames'
import childProcess from 'child_process'

type CameraOptions = {
  width?: number
  height?: number
  framerate?: number
  timeout?: number
  codec?: string
}

interface ICamera {
  JPEG_START: Buffer
  JPEG_END: Buffer
  child: any
  childPipe: any
  options: CameraOptions
  start: () => void
  stop: () => void
  on: (event: string, handler: Function) => any
  off: (event: string, handler: Function) => any
}

const defaultOptions: CameraOptions = {
  width: 640,
  height: 480,
  timeout: 0,
  framerate: 24
}

class Camera implements ICamera {
  JPEG_START;
  JPEG_END;
  child: any;
  childPipe: any;
  options;
  
  constructor(options = {}) {
    this.JPEG_START = Buffer.from('\xff\xd8', 'binary')
    this.JPEG_END = Buffer.from('\xff\xd9', 'binary')
    this.child = null
    this.childPipe = null
    this.options = {
      ...defaultOptions,
      ...options,
      codec: 'MJPEG'
    }
  }

  start() {
    const args: string[] = [
      '--nopreview'
    ]

    Object.entries(this.options).forEach(([key, val]) => {
      args.push('--' + key);
      if (val || val === 0) {
        args.push(String(val));
      }
    })

    args.push('-o')
    args.push('-')

    this.child = childProcess.spawn('raspivid', args, {
      stdio: ['ignore', 'pipe', 'inherit']
    });

    this.childPipe = this.child.stdout.pipe(new SplitFrames({
      startWith: this.JPEG_START,
      endWith: this.JPEG_END,
    }))

    console.log('started')
  }

  stop() {
    this.child.kill('SIGINT')
    this.child = null
    this.childPipe = null
  }

  on(event: string, handler: Function) {
    console.log('Event started')
    return this.childPipe.on(event, handler)
  }

  off(event: string, handler: Function) {
    return this.childPipe.off(event, handler)
  }
  
}

export default Camera

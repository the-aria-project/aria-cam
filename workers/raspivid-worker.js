const SplitFrames = require('split-frames')
const childProcess = require('child_process')
const { workerData, parentPort } = require('worker_threads')

try {
  const {
    width,
    height,
    timeout,
    framerate,
  } = workerData

  const JPEG_START = Buffer.from('\xff\xd8', 'binary')
  const JPEG_END = Buffer.from('\xff\xd9', 'binary')

  const options = {
    width,
    height,
    timeout,
    framerate,
    codec: 'MJPEG'
  }

  const args = ['--nopreview']

  Object.entries(options).forEach(([key, val]) => {
    args.push('--' + key)
    if (val || val === 0) {
      args.push(String(val))
    }
  })

  args.push('-o')
  args.push('-')

  const child = childProcess.spawn('raspivid --nopreview --width 1280 --height 720 --timeout 0 --framerate 20 --codec MJPEG -o - | tee test_video.mp4', [], {
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  // const child = childProcess.spawn('raspivid', args, {
  //   stdio: ['ignore', 'pipe', 'inherit'],
  // })

  const stream = child.stdout.pipe(
    new SplitFrames({
      startWith: JPEG_START,
      endWith: JPEG_END,
    })
  )

  stream.on('data', chunk => {
    parentPort.postMessage(chunk)
  })
} catch (err) {
  throw err
}

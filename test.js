const tf = require('@tensorflow/tfjs-node')
const cocoSsd = require('@tensorflow-models/coco-ssd')
const path = require("path");
const { Worker } = require("worker_threads");

let model
let worker

const _main = async () => {
  console.log('Starting')
  console.log('Loading model')
  const s = new Date().getTime()
  model = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
  const e = new Date().getTime()
  console.log(`Loaded model in ${e - s}ms`)

  worker = new Worker(path.join(__dirname, './workers/raspivid-worker.js'), {
    workerData: {
      width: 1280,
      height: 720,
      timeout: 0,
      framerate: 1
    }
  })
}

_main().then(() => {
  worker.on('message', async chunk => {
    console.log('Frame captured')
    const s = new Date().getTime()
    // const buffer = Buffer.from(chunk.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64')
    const imageData = tf.node.decodeImage(chunk)
    console.log(imageData)
    const detection = await model.detect(
      imageData,
      1,
      0.5
    )
    const e = new Date().getTime()
    console.log(`${detection.length} predictions made in ${e - s}ms`)
  })
})


const tf = require('@tensorflow/tfjs-node')
const cocoSsd = require('@tensorflow-models/coco-ssd')
const path = require("path");
const { Worker } = require("worker_threads");

let model
let worker

let readyForPrediction = true
const predictionInterval = 1000

const _main = async () => {
  console.log('Starting')
  console.log('Loading model')
  const s = new Date().getTime()
  model = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
  const e = new Date().getTime()
  console.log(`Loaded model in ${e - s}ms`)

  const a = new Date().getTime()
  worker = new Worker(path.join(__dirname, './workers/raspivid-worker.js'), {
    workerData: {
      width: 640,
      height: 480,
      timeout: 0,
      framerate: 20
    }
  })
  const b = new Date().getTime()
  console.log(`Took ${b - a}ms to create thread`)
}

_main().then(() => {
  worker.on('message', async chunk => {

    if (readyForPrediction) {
      readyForPrediction = false
      setTimeout(() => {
        readyForPrediction = true
      }, predictionInterval)

      console.log('Making prediction')
      const s = new Date().getTime()
      // const buffer = Buffer.from(chunk.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64')
      const iS = new Date().getTime()
      const imageData = tf.node.decodeImage(chunk)
      const iE = new Date().getTime()
      console.log(`Image Data took ${iE - iS}ms`)
      console.log(imageData)
      const detection = await model.detect(
        imageData,
        3,
        0.5
      )
      const e = new Date().getTime()
      console.log(`${detection.length} predictions made in ${e - s}ms`)
    }
    
    console.log('Frame captured')
  })
})


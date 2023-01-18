require('@tensorflow/tfjs-node')
const cocoSsd = require('@tensorflow-models/coco-ssd')
const path = require("path");
const { Worker } = require("worker_threads");

let model
let worker

let readyForPrediction = true
const predictionInterval = 1000

const detectionWorker = new Worker(path.join(__dirname, './workers/predict-object.js'))

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
  detectionWorker.on('message', (predictions) => {
    console.log(predictions.length)
  })
  worker.on('message', chunk => {
    if (readyForPrediction) {
      readyForPrediction = false
      setTimeout(() => {
        readyForPrediction = true
      }, predictionInterval)
      detectionWorker.postMessage(Buffer.from(chunk).toString('base64'))
    }
    console.log('Frame captured')
  })
})


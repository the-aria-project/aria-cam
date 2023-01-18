const path = require("path");
const { Worker } = require("worker_threads");

let worker

let lastDetectionWorker = 0
let readyForPrediction = true
const predictionInterval = 2000
let predictionTimer = setInterval(() => {
  readyForPrediction = true
}, predictionInterval)

const detectionWorker0 = new Worker(path.join(__dirname, './workers/predict-object.js'))
const detectionWorker1 = new Worker(path.join(__dirname, './workers/predict-object.js'))

const _main = async () => {
  console.log('Starting')

  const a = new Date().getTime()
  worker = new Worker(path.join(__dirname, './workers/raspivid-worker.js'), {
    workerData: {
      width: 1280,
      height: 720,
      timeout: 0,
      framerate: 20
    }
  })
  const b = new Date().getTime()
  console.log(`Took ${b - a}ms to create thread`)
}

const makePrediction = (chunk) => {
  readyForPrediction = false
  if (lastDetectionWorker === 0) {
    lastDetectionWorker = 1
    detectionWorker1.postMessage(Buffer.from(chunk).toString('base64'))
  } else {
    lastDetectionWorker = 0
    detectionWorker0.postMessage(Buffer.from(chunk).toString('base64'))
  }
}

_main().then(() => {
  detectionWorker0.on('message', (predictions) => {
    console.log(predictions)
  })
  detectionWorker1.on('message', (predictions) => {
    console.log(predictions)
  })
  worker.on('message', chunk => {
    if (readyForPrediction) {
      makePrediction(chunk)
    }
  })
})


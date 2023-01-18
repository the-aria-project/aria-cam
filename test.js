const path = require("path");
const { Worker } = require("worker_threads");

let worker

let readyForPrediction = true

const detectionWorker = new Worker(path.join(__dirname, './workers/predict-object.js'))

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
  detectionWorker.postMessage(Buffer.from(chunk).toString('base64'))
}

_main().then(() => {
  detectionWorker.on('message', (predictions) => {
    readyForPrediction = true
    console.log(predictions)
  })
  worker.on('message', chunk => {
    if (readyForPrediction) {
      makePrediction(chunk)
    }
  })
})


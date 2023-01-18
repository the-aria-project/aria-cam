const path = require("path");
const { Worker } = require("worker_threads");

let worker

let readyForPrediction = true
const predictionInterval = 2000

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

_main().then(() => {
  detectionWorker.on('message', (predictions) => {
    console.log(predictions)
  })
  worker.on('message', chunk => {
    if (readyForPrediction) {
      readyForPrediction = false
      setTimeout(() => {
        readyForPrediction = true
      }, predictionInterval)
      detectionWorker.postMessage(Buffer.from(chunk).toString('base64'))
    }
  })
})


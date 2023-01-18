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

const detectObjects = (buffer) => new Promise((resolve, reject) => {
  console.log('Making prediction')
  const detectionWorker = new Worker(path.join(__dirname, './workers/predict-object.js'), {
    workerData: {
      model,
      buffer: Buffer.from(buffer).toString('base64'),
    }
  })

  detectionWorker.on('message', (predictions) => {
    resolve(predictions)
  })

  detectionWorker.on('error', err => {
    reject(err)
  })
})

_main().then(() => {
  worker.on('message', chunk => {

    if (readyForPrediction) {
      readyForPrediction = false
      setTimeout(() => {
        readyForPrediction = true
      }, predictionInterval)

      detectObjects(chunk)
        .then(predictions => {
          console.log(predictions.length)
        })
    }
    
    console.log('Frame captured')
  })
})


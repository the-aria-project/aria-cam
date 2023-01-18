const tf = require('@tensorflow/tfjs-node')
const cocoSsd = require('@tensorflow-models/coco-ssd')
const { parentPort } = require("worker_threads")

let model = null
let isMakingPrediction = false

cocoSsd.load({ base: 'lite_mobilenet_v2' }).then(m => { model = m })

const predict = (buffer) => new Promise((resolve, reject) => {
  const imageData = tf.node.decodeImage(Buffer.from(buffer.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64'))
  model.detect(
    imageData,
    3,
    0.5
  ).then(predictions => {
    resolve(predictions)
  })
})

parentPort.on('message', (buffer) => {
  if (model) {
    if (!isMakingPrediction) {
      isMakingPrediction = true
      predict(buffer).then(predictions => {
        parentPort.postMessage(predictions)
        isMakingPrediction = false
      })
    }
  }
})

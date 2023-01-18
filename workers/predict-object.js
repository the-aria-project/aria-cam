const tf = require('@tensorflow/tfjs-node')
const { workerData, parentPort } = require("worker_threads")

const {
  model,
  buffer
} = workerData

const imageData = tf.node.decodeImage(Buffer.from(buffer.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64'))
model.detect(
  imageData,
  3,
  0.5
).then(predictions => {
  parentPort.postMessage(predictions)
})

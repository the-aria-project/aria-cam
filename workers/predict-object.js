const { workerData, parentPort } = require("worker_threads")

const {
  tf,
  model,
  buffer
} = workerData

const imageData = tf.node.decodeImage(buffer)
model.detect(
  imageData,
  3,
  0.5
).then(predictions => {
  parentPort.postMessage(predictions)
})

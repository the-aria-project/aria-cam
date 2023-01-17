const tf = require('@tensorflow/tfjs-node')
const { parentPort, workerData } = require('worker_threads')
const config = require('../config.json')

console.log('Object prediction worker starting')
const { model } = workerData

const predictObjects = async (chunk) => {
  let output
  try {
    const imageData = tf.node.decodeImage(chunk)
    const detection = await model.detect(
      imageData,
      config.object_detection_options.max_objects,
      config.object_detection_options.sensitivity
    )
    output = { chunk, predictions: detection }
    imageData.dispose()
    return output
  } catch (err) {
    throw err
  }
}

parentPort.on('message', async (chunk) => {
  const predictions = await predictObjects(chunk)
  parentPort.postMessage(predictions)
})

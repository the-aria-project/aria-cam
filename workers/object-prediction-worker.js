const tf = require('@tensorflow/tfjs-node')
const { workerData, parentPort } = require('worker_threads')
const config = require('../config.json')
require('@tensorflow/tfjs-backend-cpu')

const { model } = workerData
console.log('Object prediction worker starting')

const predictObjects = async (cameraFrame) => {
  try {
    const imageData = tf.node.decodeImage(cameraFrame, buffer)
    const detection = await model.detect(
      imageData,
      config.object_detection_options.max_objects,
      config.object_detection_options.sensitivity
    )
    cameraFrame.predictions = detection
    imageData.dispose()
    return cameraFrame
  } catch (err) {
    return cameraFrame
  }
}

parentPort.on('message', (cameraFrame) => {
  const newFrame = predictObjects(cameraFrame)
  parentPort.postMessage(newFrame)
})

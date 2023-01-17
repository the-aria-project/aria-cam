const tf = require('@tensorflow/tfjs-node')
const cocoSsd = require('@tensorflow-models/coco-ssd')
const { parentPort } = require('worker_threads')
const config = require('../config.json')

console.log('Object prediction worker starting')

const predictObjects = async (model, cameraFrame) => {
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

cocoSsd.load({ base: 'mobilenet_v2' })
  .then(model => {
    parentPort.on('message', async (cameraFrame) => {
      console.log(cameraFrame)
      const newFrame = await predictObjects(model, cameraFrame)
      parentPort.postMessage(newFrame)
    })
  })
  .catch(err => {
    throw err
  })

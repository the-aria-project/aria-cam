const tf = require('@tensorflow/tfjs-node')
const cocoSsd = require('@tensorflow-models/coco-ssd')
const { parentPort } = require('worker_threads')
const config = require('../config.json')

console.log('Object prediction worker starting')

const predictObjects = async (model, cameraFrame, chunk) => {
  try {
    const imageData = tf.node.decodeImage(chunk)
    const detection = await model.detect(
      imageData,
      config.object_detection_options.max_objects,
      config.object_detection_options.sensitivity
    )
    cameraFrame.predictions = detection
    imageData.dispose()
    return cameraFrame
  } catch (err) {
    throw err
  }
}

cocoSsd.load({ base: 'lite_mobilenet_v2' })
  .then(model => {
    console.log('Model loaded')
    parentPort.on('message', async ({
      cameraFrame,
      chunk,
    }) => {
      const newFrame = await predictObjects(model, cameraFrame, chunk)
      parentPort.postMessage(newFrame)
    })
  })
  .catch(err => {
    throw err
  })

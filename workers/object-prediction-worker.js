require('@tensorflow/tfjs-backend-cpu')
const cocoSsd = require('@tensorflow-models/coco-ssd')
const tf = require('@tensorflow/tfjs-node')
const { parentPort } = require('worker_threads')
const config = require('../config.json')

try {
  console.log('Object prediction worker starting...')
  cocoSsd.load({ base: 'lite_mobilenet_v2' }).then(model => {
    console.log('Object prediction worker ready!')
    const predictObjects = async (cameraFrame) => {
      try {
        const imageData = tf.node.decodeImage(Buffer.from(cameraFrame.buffer.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64'))
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
  
    parentPort.on('message', async (cameraFrame) => {
      const newFrame = await predictObjects(cameraFrame)
      parentPort.postMessage(newFrame)
    })
  }).catch(err => {
    throw err
  })
} catch (err) {
  throw err
}
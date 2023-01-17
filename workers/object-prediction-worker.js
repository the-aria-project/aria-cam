require('@tensorflow/tfjs-backend-cpu')
const cocoSsd = require('@tensorflow-models/coco-ssd')
const tf = require('@tensorflow/tfjs-node')
const { parentPort, workerData } = require('worker_threads')
const config = require('../config.json')

try {
  console.log('Object prediction worker starting...')
  cocoSsd.load({ base: 'lite_mobilenet_v2' }).then(model => {
    console.log('Object prediction worker ready!')
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
  }).catch(err => {
    throw err
  })
} catch (err) {
  throw err
}
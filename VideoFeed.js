const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn

const defaultConfig = {
  tmpPath: path.join(__dirname, 'tmp'),
  imageExtension: 'jpg',
  fps: 10,
  width: 640,
  height: 480
}

class VideoFeed {
  constructor(config = defaultConfig) {
    const cfg = {
      ...defaultConfig,
      ...config
    }
    
    // Config
    this.tmpPath = cfg.tmpPath
    this.imageExtension = cfg.imageExtension
    this.lastImagePath = path.join(this.tmpPath, `${new Date().getTime()}.${this.imageExtension}`)
    this.fps = cfg.fps
    this.width = cfg.width
    this.height = cfg.height

    // State
    this.isRecording = false
    this.isTicking = false
    this.ticker = null

    if (!fs.existsSync(this.tmpPath)) {
      fs.mkdirSync(this.tmpPath)
    }
    
  }

  startWritingImages(onImageWritten = () => {}) {
    if (!this.isRecording) {
      this.isRecording = true
      this.frameLoop(onImageWritten)
    }
  }

  async frameLoop(onImageWritten) {
    if (this.isRecording) {
      console.log('Taking image')
      this.takeImage()
        .then((fullImagePath) => {
          this.frameLoop(onImageWritten)
          onImageWritten(
            fullImagePath,
            fullImagePath.replace(this.tmpPath, '')
          )
        })
    }
  }

  stopWritingImages() {
    if (this.isRecording) {
      this.isRecording = false
    }
  }
  
  takeImage() {
    return new Promise((resolve, reject) => {
      const imgName = new Date().getTime()
      const fullImagePath = `${this.tmpPath}/${imgName}.${this.imageExtension}`
      const child = spawn(
        'raspistill',
        [
          '-o', fullImagePath,
          '-w', `${this.width}`,
          '-h', `${this.height}`,
          '-q', '1',
          '--timeout', '1'
        ]
      )

      child.on('close', () => {
        resolve(fullImagePath)
      })

      child.on('error', (err) => {
        console.log(err)
        reject(err)
      })

    })
  }
  
}

module.exports = VideoFeed

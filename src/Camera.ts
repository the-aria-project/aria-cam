const mjpeg = require('mp4-mjpeg')

interface I_Camera {
  readyToProcessVideo: boolean
}

class Camera implements I_Camera {
  readyToProcessVideo = false

  constructor() {
    
  }
  
}

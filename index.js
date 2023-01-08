const http = require('http')
const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const socketIO = require('socket.io')
const express = require('express')

const app = express()
const server = http.Server(app)
const io = socketIO(server)
const VideoFeed = require('./VideoFeed')

// State
const video = new VideoFeed()
let clientCount = 0

const frameHandler = (imagePath, imgUrl, socket) => {
  socket.emit('frame', imgUrl)
}

io.on('connection', socket => {
  clientCount++
  console.log('Client connected')

  if (!video.isTicking) {
    console.log('Recording frames')
    video.startWritingImages((imgPath, imgUrl) => frameHandler(imgPath, imgUrl, socket))
  }
  
})

io.on('disconnect', () => {
  clientCount--
  if (clientCount === 0 && video.isTicking) {
    console.log('Stopping recording frames')
    video.stopWritingImages()
  }
})

app.use(express.static('tmp'))

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'))
})

server.listen(3000, () => {
  console.log('Server running')
})

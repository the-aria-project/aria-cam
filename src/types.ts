import { ConfigDestination } from 'aria-lib/lib/types'

export type Config = {
  camera_friendly_name: string
  destinations: ConfigDestination[]
  server: {
    port: number
  }
  camera: {
    width: number
    height: number
    framerate: number
    reset_interval: number
  }
}

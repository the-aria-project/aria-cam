import { ConfigDestination } from 'aria-types'

export type Config = {
  destinations: ConfigDestination[]
  server: {
    port: number
    live_view_path: string
  }
  camera: {
    width: number
    height: number
    framerate: number
    reset_interval: number
  }
}

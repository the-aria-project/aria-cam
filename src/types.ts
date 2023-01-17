import { ConfigDestination } from 'aria-lib/lib/types'

export type Config = {
  camera_friendly_name: string
  server_port: number
  frame_destinations: ConfigDestination[]
  record_locally: boolean
  use_object_detection: boolean,
  object_detection_options: {
    max_objects: number,
    sensitivity: number
  },
  camera: {
    width: number
    height: number
    framerate: number
    reset_interval: number
  }
}

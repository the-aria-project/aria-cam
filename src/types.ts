import { ConfigDestination } from 'aria-lib/lib/types'

export type Config = {
  camera_friendly_name: string
  server_port: number
  use_live_view: boolean
  aria_services: {
    use_object_detection: boolean,
    use_video_storage: boolean,
    destinations: {
      aria_cam_brain: string
      aria_hub: string
      aria_storage: string
    }
  }
  camera: {
    width: number
    height: number
    framerate: number
  }
}

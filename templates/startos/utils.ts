// startos/utils.ts — shared constants.

// Port the service listens on (health-check + interface target).
export const servicePort = 8080

// The 'main' volume as the SDK/JS runtime sees it. The container sees the same
// volume at its mountpoint (see main.ts mountVolume — convention: /data).
export const mainVolume = '/media/startos/volumes/main'

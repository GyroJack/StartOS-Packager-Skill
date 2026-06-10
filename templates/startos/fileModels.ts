// startos/fileModels/index.ts (or fileModels/<name>.ts)
// Type-safe wrappers around the service's config/data files. Paths are ABSOLUTE
// from the JS runtime's view; the container reads the same files at its
// mountpoint (e.g. /data). See reference/sdk-api.md §7.
import { FileHelper, z } from '@start9labs/start-sdk'
import { mainVolume } from '../utils'

// .env (KEY=VALUE). Use a strict schema if you know the keys.
export const configFile = FileHelper.env(
  `${mainVolume}/.env`,
  z.record(z.string(), z.string()),
)

// JSON example:
// export const settings = FileHelper.json(
//   `${mainVolume}/settings.json`,
//   z.object({ name: z.string(), enabled: z.boolean() }),
// )

// Other formats: FileHelper.yaml / .toml / .ini / .xml / .string / .raw(...)

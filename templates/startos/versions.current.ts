// startos/versions/current.ts
import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '<upstream-version>:0', // e.g. '1.2.2:0'  ("<upstream>:<package-revision>")
  releaseNotes: {
    en_US: 'Initial StartOS package for <upstream> v<upstream-version>.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE, // block downgrades unless you implement a real down-migration
  },
})

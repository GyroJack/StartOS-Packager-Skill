// startos/versions/index.ts
import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'

// `current` first; add prior VersionInfo objects to `other` when you bump.
export const versionGraph = VersionGraph.of({ current, other: [] })

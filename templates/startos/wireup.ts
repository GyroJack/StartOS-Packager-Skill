// Small wire-up files. Split these into their real paths (see README mapping):
// startos/actions/index.ts, startos/init/index.ts, startos/backups.ts,
// startos/dependencies.ts. Do NOT edit startos/index.ts or startos/sdk.ts.

// ===== startos/actions/index.ts =====
import { sdk } from '../sdk'
import { configure } from './config'
export const actions = sdk.Actions.of().addAction(configure)

// ===== startos/backups.ts =====
// export const { createBackup, restoreInit } = sdk.setupBackups(
//   async ({ effects }) => sdk.Backups.ofVolumes('main'),
// )

// ===== startos/dependencies.ts =====
// export const setDependencies = sdk.setupDependencies(async ({ effects }) => ({}))

// ===== startos/init/index.ts =====
// import { sdk } from '../sdk'
// import { setDependencies } from '../dependencies'
// import { setInterfaces } from '../interfaces'
// import { versionGraph } from '../versions'
// import { actions } from '../actions'
// import { restoreInit } from '../backups'
// export const init = sdk.setupInit(
//   restoreInit, versionGraph, setInterfaces, setDependencies, actions,
// )
// export const uninit = sdk.setupUninit(versionGraph)

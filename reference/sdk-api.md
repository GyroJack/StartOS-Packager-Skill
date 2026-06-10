# SDK API Reference — `@start9labs/start-sdk` (1.5.x, StartOS 0.4.0.x)

Import surface: `import { setupManifest, buildManifest, VersionInfo, IMPOSSIBLE,
VersionGraph, StartSdk, FileHelper, Volume, Daemons, SubContainer, z, T } from
'@start9labs/start-sdk'`.

The singleton `sdk` (created once in `startos/sdk.ts` as
`StartSdk.of().withManifest(manifest).build(true)`) exposes the builders you use
everywhere: `sdk.setupMain`, `sdk.setupInterfaces`, `sdk.setupInit`,
`sdk.setupUninit`, `sdk.setupBackups`, `sdk.setupDependencies`, `sdk.Daemons`,
`sdk.SubContainer`, `sdk.Mounts`, `sdk.MultiHost`, `sdk.createInterface`,
`sdk.healthCheck` (`.checkPortListening`, `.checkWebUrl`), `sdk.Actions`,
`sdk.Action`, `sdk.InputSpec`, `sdk.Value`, `sdk.List`, `sdk.Variants`.

---

## 1. Manifest — `setupManifest({...})`
Required: `id` (string, keep single-quoted on its own line), `title`, `license`,
`packageRepo`, `upstreamRepo`, `marketingUrl`, `donationUrl` (string|null),
`description: { short, long }` (LocaleString = `{ en_US: '...' }`; short ≤80,
long ≤500), `volumes: string[]` (≥1, e.g. `['main']`), `images`, `alerts`,
`dependencies`.
Optional: `osVersion`, `hardwareRequirements`, `hardwareAcceleration`,
`nestedRuntime`, `plugins`.

### images: `Record<ImageId, SDKImageInputSpec>`
```ts
images: {
  main: {
    source: { dockerBuild: { dockerfile: 'Dockerfile', workdir: '.', buildArgs?: {} } },
    // OR: source: { dockerTag: 'ghcr.io/org/app:1.2.3' },
    arch: ['x86_64', 'aarch64'],          // subset of x86_64 | aarch64 | riscv64
    emulateMissingAs: null,               // or an arch to emulate uncovered targets
    nvidiaContainer?: false,
  },
}
```
`ImageSource = 'packed' | { dockerBuild: {...} } | { dockerTag: string }`. The
`imageId` key is what you pass to `SubContainer.of(effects, { imageId: 'main' }, ...)`.

### alerts (each LocaleString | null): `install, update, uninstall, restore, start, stop`.
### dependencies: `Record<pkgId, { description, optional: boolean, s9pk: string }>`.

`buildManifest(versionGraph, manifest)` (in the plumbing `index.ts`) merges the
version graph + SDK/OS versions into the final manifest. Don't call it yourself.

---

## 2. Versions & migrations
```ts
// versions/current.ts
export const current = VersionInfo.of({
  version: '1.2.2:0',                       // "<upstream-version>:<package-revision>"
  releaseNotes: { en_US: '...' },
  migrations: { up: async ({ effects }) => {}, down: IMPOSSIBLE },  // down: IMPOSSIBLE blocks downgrade
})
// versions/index.ts
export const versionGraph = VersionGraph.of({ current, other: [] })  // current FIRST; other = prior VersionInfos
```
Bump: add the old `VersionInfo` to `other`, write a new `current` with a higher
`version` and a real `up` migration if data layout changed.

---

## 3. Interfaces — `sdk.setupInterfaces(async ({ effects }) => [...receipts])`
```ts
const host = sdk.MultiHost.of(effects, 'ui-multi')
const origin = await host.bindPort(PORT, { protocol: 'http' })   // 'http'|'https'|'ws'|'wss'|'ssh'|'dns'|null
const iface = sdk.createInterface(effects, {
  name: 'Web UI', id: 'ui', description: '...',
  type: 'ui',                       // 'ui' | 'api' | 'p2p'
  masked: false, schemeOverride: null, username: null, path: '', query: {},
})
const receipt = await origin.export([iface])
return [receipt]
```
StartOS terminates TLS and serves the interface over Tor / LAN / custom domains.
A websocket relay + web UI on one port → one `'ui'` interface bound `'http'`
(clients connect `wss://`).

---

## 4. Main / runtime — `sdk.setupMain(async ({ effects }) => Daemons)`
```ts
const sub = await sdk.SubContainer.of(
  effects,
  { imageId: 'main' },
  sdk.Mounts.of().mountVolume({ volumeId: 'main', subpath: null, mountpoint: '/data', readonly: false }),
  'main-sub',
)
return sdk.Daemons.of(effects).addDaemon('primary', {
  subcontainer: sub,
  exec: { command: ['/usr/local/bin/start.sh'] },   // string[] argv; overrides image CMD
  ready: {
    display: 'Web Interface',
    fn: () => sdk.healthCheck.checkPortListening(effects, PORT, {
      successMessage: 'ready', errorMessage: 'not ready',
    }),
  },
  requires: [],
})
```
- `Mounts.of()` chainable: `.mountVolume({volumeId, subpath, mountpoint, readonly})`,
  `.mountAssets({subpath, mountpoint})`, `.mountDependency({dependencyId, volumeId, mountpoint, readonly})`,
  `.mountBackups({mountpoint})`.
- `Daemons.of(effects)` chainable: `.addDaemon(id, opts)`, `.addOneshot(id, opts)`
  (runs to completion before dependents — migrations, chown), `.addHealthCheck(id, opts)`.
- `exec.command` is an argv array. `requires: [otherDaemonId]` orders startup.

---

## 5. Health — `sdk.healthCheck.*`
```ts
checkPortListening(effects, port, { successMessage, errorMessage, timeout?, timeoutMessage? })
checkWebUrl(effects, url, { successMessage?, errorMessage?, timeout? })
```
A `ready.fn` returns a `HealthCheckResult`:
```ts
{ result: 'success' | 'loading' | 'disabled' | 'starting' | 'waiting' | 'failure', message?: string }
```
`message` is REQUIRED for `'loading'` and `'failure'`. Return a custom
`{ result: 'failure', message: '...' }` for the setup-gating pattern.

---

## 6. Actions & input forms
```ts
// actions/index.ts
export const actions = sdk.Actions.of().addAction(configure).addAction(other)

// an action
export const configure = sdk.Action.withInput(
  'configure',
  async ({ effects }) => ({                       // metadata (Omit<ActionMetadata,'hasInput'>)
    name: 'Configure', description: '...', warning: null,
    visibility: 'enabled',                         // 'enabled' | 'hidden' | { disabled: 'reason' }
    allowedStatuses: 'any',                        // 'any' | 'only-stopped' | 'only-running'
    group: null,
  }),
  configSpec,                                       // an InputSpec
  async ({ effects, prefill }) => ({ /* DeepPartial prefill from disk */ }) ?? null, // getInput
  async ({ effects, input }) => { /* write files */ return null },                    // run -> ActionResult|null
)
// no-input button: sdk.Action.withoutInput(id, metadata, async ({effects}) => null)
```

### InputSpec & Value builders
```ts
const { InputSpec, Value, List } = sdk
const spec = InputSpec.of({
  field: Value.text({ name, description?, required, default: null, masked?, placeholder?,
                      minLength?, maxLength?, patterns?: [{regex, description}], inputmode?, generate? }),
})
```
`Value.*` catalog (key options):
- `text` / `textarea` — string; `required`, `default`, `masked`, `patterns`.
- `number` — `required`, `default`, `integer`, `min`, `max`, `step`, `units`.
- `toggle` — boolean; `default`. `triState` — boolean|null.
- `select` — `default`, `values: Record<value,label>` → one of the keys.
- `multiselect` — `values`, `default: string[]`, `minLength`/`maxLength`.
- `color`, `datetime`, `file` ({ extensions }), `hidden`.
- `object({ name, description? }, InputSpec.of({...}))` — a collapsible group.
- `list(List.text({ name, default?: string[], minLength?, maxLength? }, { placeholder?, patterns? }))`
  — a reorderable array; `List.obj({...}, { spec, displayAs?, uniqueBy? })` for object lists.
- `union({ name, default }, Variants.of({ key: { name, spec } }))` — discriminated union.
- `dynamic*` variants (`dynamicSelect`, `dynamicText`, ...) compute options at
  runtime via `({ effects, prefill }) => spec`.

`type ConfigInput = typeof spec._TYPE` gives you the validated input type.
`spec.filter(keys)`, `spec.disable(keys, msg)` narrow/lock fields.

`ActionMetadata` fields: `name, description, warning, visibility,
allowedStatuses, group` (`hasInput` is added for you).

---

## 7. FileHelper — read/write the service's config & data files
```ts
import { FileHelper, z } from '@start9labs/start-sdk'
export const envFile  = FileHelper.env(`/media/startos/volumes/main/.env`, z.record(z.string(), z.string()))
export const conf     = FileHelper.json(`/media/startos/volumes/main/config.json`, zSchema)
// also: .yaml .toml .ini .xml .string .raw(path, toFile, fromFile, validate)
```
Path forms: an absolute string is used **as-is**; a relative string resolves
under the volume root; `{ base: volume, subpath }` joins them. The `main` volume
root for the JS runtime is `/media/startos/volumes/main` (and `Volume`'s `.path`
is `/media/startos/volumes/<id>`). The container sees the same files at the
`mountpoint` you chose in `mountVolume` (e.g. `/data`).

Read/write:
```ts
await envFile.read().once()             // Promise<A | null>   (one-shot)
await envFile.read().const(effects)     // Promise<A | null>   (re-runs caller on change — use in main.ts)
envFile.read().watch(effects) / .onChange(effects, cb) / .waitFor(effects, pred)
await envFile.write(effects, data)      // overwrite whole file
await envFile.merge(effects, partial)   // deep-merge
```

---

## 8. Backups — `sdk.setupBackups`
```ts
export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) => sdk.Backups.ofVolumes('main'),   // back up whole volume(s)
)
```
Advanced: `Backups.ofSyncs(...)`, `.withPgDump({...})`, `.withMysqlDump({...})`,
`.addVolume`, `.setPreBackup/.setPostRestore` hooks. Volume backups land under
`/media/startos/backup/volumes/<id>/`.

---

## 9. Dependencies — `sdk.setupDependencies`
```ts
export const setDependencies = sdk.setupDependencies(async ({ effects }) => ({
  // 'other-pkg': { kind: 'running', healthChecks: ['ui'], versionRange: '>=1' },
}))
```
Also declare each dep in the manifest's `dependencies` map.

---

## 10. Init / Uninit — wire everything together
```ts
// init/index.ts
export const init = sdk.setupInit(restoreInit, versionGraph, setInterfaces, setDependencies, actions)
export const uninit = sdk.setupUninit(versionGraph)
// run extra logic on install/update/restore/boot:
sdk.setupOnInit(async (effects, kind /* 'install'|'update'|'restore'|null */) => { ... })
```

---

## Plumbing files — DO NOT EDIT
- `startos/index.ts` — exports `manifest, main, init, uninit, actions, createBackup`.
- `startos/sdk.ts` — builds the `sdk` singleton from the manifest.

---
name: startos-packager
description: >-
  Package any service (web app, daemon, node, relay) into a StartOS 0.4.0.x
  `.s9pk` using the @start9labs/start-sdk. Use when asked to "package X for
  StartOS / Start9", wrap a Docker image or upstream repo as a StartOS service,
  write a service manifest/main/config/health/interfaces/backups, build an
  s9pk, or debug a StartOS package build. Covers scaffolding from the
  hello-world template, writing the TypeScript package definition, building the
  image from source or a prebuilt tag, and producing the installable s9pk.
---

# StartOS Service Packager (0.4.0.x)

You are packaging a service into a StartOS `.s9pk`. A StartOS package is a small
**TypeScript project** (built with `@start9labs/start-sdk`) that wraps a
container image and declares how the service runs, is configured, exposes
network interfaces, checks health, and backs up. `make` bundles the TS and
packs it — together with the built image — into one signed `.s9pk` file the user
sideloads or publishes.

This skill is model-agnostic: it is a set of instructions, reference docs,
copy-paste templates, and shell scripts. Read the referenced files **only when
you need them** (progressive disclosure) — do not paste their full contents into
your reasoning up front.

## Golden rules (read these every time)

1. **Start from the official template.** Never hand-roll the project layout.
   Scaffold from `Start9Labs/hello-world-startos` — it carries the Makefile,
   `s9pk.mk`, CI workflows, and the "plumbing" files you must not edit
   (`startos/index.ts`, `startos/sdk.ts`).
2. **The build needs a git commit.** `make` depends on `.git/index`; a freshly
   scaffolded repo must have one commit before the first build or it fails with
   `No rule to make target '.git/index'`.
3. **`make` shells out to Docker.** If the shell isn't in the `docker` group,
   wrap commands as `sg docker -c '<cmd>'`. See `reference/cli-and-workflow.md`.
4. **FileHelper paths are absolute, from the JS runtime's view.** The `main`
   volume is at `/media/startos/volumes/main/...` for the SDK code, and mounted
   at your chosen `mountpoint` (e.g. `/data`) inside the container. Write config
   to the volume path; the container reads it at the mountpoint.
5. **Write COMPLETE config files.** Many upstream services hard-fail on a single
   missing env var. The config action must emit every required key (with
   defaults), not just the fields the user changed.
6. **Gate startup when required config is missing.** If the service crashes
   without mandatory config, don't crash-loop — run a holding `sleep infinity`
   daemon whose health check reports an actionable "needs setup" failure until
   the user configures it. See the gated `main.ts` template.
7. **Type-check before you build.** `npm run check` (tsc) catches almost all SDK
   misuse in seconds; the full `make` (Docker image build) is slow. Iterate on
   tsc first.

## Workflow

### 0. Understand the service (before scaffolding)
Determine, from the upstream repo / image / the user:
- **Image source:** is there a trusted prebuilt image (`dockerTag`), or do you
  build from source (`dockerBuild` + a `Dockerfile`)? Build-from-source is more
  sovereign and is the StartOS-preferred default; pin a release tag.
- **How it's configured:** env vars? a config file (yaml/toml/ini/json/env)?
  CLI flags? Which settings are **required** vs optional? (Grep the source for
  the equivalent of `getEnv`/`MustGet`/`log.Fatal` to find mandatory keys.)
- **Ports** it listens on, and whether it's a web UI, an API, or a P2P/relay.
- **Where it stores data** (so that path lands on the persistent volume), and
  whether it reads assets relative to its working directory.
- **Health signal:** a listening port and/or an HTTP endpoint.

### 1. Scaffold
Run `scripts/scaffold.sh <package-id> <Title> <target-dir>`. It clones the
template, sets the id/title in the manifest, removes the template's `.claude`
settings, installs deps, and makes the initial commit. (If you can't run the
script, follow `reference/cli-and-workflow.md` § Scaffold manually.)

### 2. Write the package definition (`startos/`)
Edit these files using the templates in `templates/startos/` as a base. Read
`reference/sdk-api.md` for exact signatures and `reference/recipes.md` to pick
the right pattern for the task at hand.
- `manifest/index.ts` — id, title, license, repos, `volumes`, `images`
  (dockerBuild vs dockerTag, `arch`), `dependencies`, `alerts`.
- `manifest/i18n.ts` — short (≤80 char) + long (≤500 char) descriptions.
- `versions/current.ts` — version string `"<upstream>:<pkg-rev>"`, release notes.
- `interfaces.ts` — bind the port(s), `createInterface` (`type: 'ui' | 'api' | 'p2p'`).
- `main.ts` — the daemon: `SubContainer` + `Mounts.mountVolume` + `exec` +
  `ready` health check. Use the **gated** template if config is mandatory.
- `fileModels/*.ts` — `FileHelper` wrappers for each config/data file.
- `actions/*.ts` — the config form (`Action.withInput` + `InputSpec`/`Value`),
  `getInput` to prefill from disk, `run` to write the complete config.
- `actions/index.ts`, `init/index.ts`, `backups.ts`, `dependencies.ts` — wire-up.
- Do **not** edit `index.ts` or `sdk.ts` (plumbing).

### 3. Image (`Dockerfile`)
Use `templates/Dockerfile.from-source` (build & pin from a repo; enable
`CGO_ENABLED=1` if the upstream needs cgo) or `templates/Dockerfile.prebuilt`
(re-tag a trusted image). If the service reads assets/data relative to its CWD,
use `templates/entrypoint.sh` to `cd` into the volume mountpoint, symlink
read-only image assets in, seed any required files, then `exec` the binary.

### 4. Type-check, then build
```
npm run check                 # tsc — fix all errors first
scripts/build.sh              # wraps `make` with docker-group + jq fallbacks
```
`make x86` / `make arm` build a single arch; `make` builds all. Output:
`<id>_<arch>.s9pk`. Verify with
`start-cli s9pk inspect <file>.s9pk manifest`.

### 5. Validate & hand off
Run `scripts/preflight.sh` to confirm the environment and package are sound
(tsc clean, id ≠ hello-world, committed, image source valid). Then the user
sideloads the `.s9pk` (StartOS UI → System → Sideload) or `make install` to a
host configured in `~/.startos/config.yaml`. Keep `README.md` (developer) and
`instructions.md` (end-user) in sync with what you built.

## Reference files (read on demand)
- `reference/cli-and-workflow.md` — every `start-cli`/`make` command, the
  `~/.startos/config.yaml` shape, manual scaffolding, and environment gotchas
  (docker group, jq, git commit).
- `reference/sdk-api.md` — the complete SDK API surface with signatures
  (manifest, images, versions, interfaces, daemons/subcontainer/mounts, health,
  actions/inputs, FileHelper, backups, dependencies, init).
- `reference/recipes.md` — the catalog of official 0.4.0.x recipes mapped to the
  API + which template to use for each.
- `reference/patterns-and-pitfalls.md` — battle-tested patterns (setup gating,
  complete-config writes, volume-path rules, build-from-source, cross-arch cgo)
  and the mistakes to avoid.

## Templates (copy and adapt)
Under `templates/`: `startos/*.ts` (manifest, i18n, versions, interfaces,
`main.ts`, `main.gated.ts`, `fileModels.ts`, `config-action.ts`, wire-up files),
`Dockerfile.from-source`, `Dockerfile.prebuilt`, `entrypoint.sh`.

## Scripts (automation)
Under `scripts/`: `scaffold.sh` (new package), `build.sh` (build with
fallbacks), `preflight.sh` (validate). All are POSIX `sh`/`bash` and print what
they do. Prefer running them over doing the steps by hand.

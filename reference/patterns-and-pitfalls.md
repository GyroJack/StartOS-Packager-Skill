# Patterns & Pitfalls

Battle-tested patterns for StartOS 0.4.0.x packages, and the mistakes that cost
time. Each pattern has a matching template under `templates/`.

## Pattern: Setup gating (require config before starting)
**When:** the upstream service crashes/exits if mandatory config (an identity,
an admin password, a license) is absent. Crash-looping looks broken to users.
**How:** in `main.ts`, read the config file; if the required value is missing,
return a *holding* daemon that runs `['sleep', 'infinity']` with a `ready.fn`
that returns `{ result: 'failure', message: 'Run the Configure action and set
X, then restart.' }`. Once configured, launch the real daemon with a real health
check. → `templates/startos/main.gated.ts`.
```ts
const cfg = await envFile.read().const(effects)
const configured = !!cfg && !!cfg.REQUIRED_KEY
if (!configured) return holdingDaemon(...)   // sleep + failing health
return realDaemon(...)
```

## Pattern: Write the COMPLETE config, every time
**When:** the upstream fatals on *any* missing key (common — e.g. Go services
that `log.Fatal` in a `getEnv`). **How:** the config action's `run` builds the
*entire* config from defaults overlaid with user input, and writes it whole —
never a partial diff. Keep optional sections (e.g. S3 creds) out unless their
feature is enabled. → `templates/startos/config-action.ts`, `buildConfig()`.
Find required keys by grepping the upstream source for its env/flag accessor
(`getEnv`, `os.Getenv` followed by fatal, `MustGet`, required CLI flags).

## Pattern: Prefill the form from disk (`getInput`)
Read the current files in `getInput` and return a `DeepPartial` so re-editing
preserves values. Persist any field you can't reconstruct from the upstream
config under a private marker key the upstream ignores (e.g.
`STARTOS_RELAY_NAME`) so you can prefill it later.

## Pattern: Volume paths (the #1 confusion)
The SDK/JS runtime sees the `main` volume at **`/media/startos/volumes/main`**.
The container sees the SAME volume at whatever `mountpoint` you set in
`mountVolume` (convention: `/data`). So: `FileHelper` paths use the
`/media/startos/volumes/main/...` form; the container reads them at `/data/...`.
Set the container's working dir / data path to the mountpoint so its files land
on the persistent (and backed-up) volume.

## Pattern: Build from source, pinned
Prefer building the image from the upstream repo at a pinned tag over trusting a
third-party prebuilt image. Use a multi-stage Dockerfile with an `ARG` for the
version so bumps don't touch the build logic. Enable `CGO_ENABLED=1` (and a C
toolchain in the build stage) only if the upstream needs cgo. →
`templates/Dockerfile.from-source`.

## Pattern: Entrypoint for relative-path services
If the service reads templates/assets/db **relative to its working directory**,
ship the read-only assets in the image and link them into the volume at start,
seeding any files the service refuses to start without. → `templates/entrypoint.sh`.
```sh
cd /data
ln -sfn /opt/app/assets assets           # read-only image assets, refreshed each boot
[ -f config.json ] || cp /opt/app/defaults/config.json .   # seed required files once
exec app
```

## Pattern: One image, two roles via `exec`
You don't need separate images for "holding" vs "running" — reuse the same
`SubContainer` and just change `exec.command` (`['sleep','infinity']` vs the real
start command).

---

## Pitfalls
- **No initial git commit → build fails** with `No rule to make target
  '.git/index'`. Commit before `make`.
- **Docker socket permission denied** → wrap with `sg docker -c '...'` (your
  shell predates docker-group membership). See cli-and-workflow.md.
- **Relative FileHelper paths** silently resolve under `process.cwd()`/volume
  root — be explicit with absolute `/media/startos/volumes/<id>/...`.
- **Partial config writes** → upstream fatals on the keys you omitted. Write all.
- **Invalid required identity values** (e.g. an npub that fails to decode) can
  *panic* the upstream — gate on validity, not just presence, and validate in
  the InputSpec with `patterns`.
- **Volume shadowing**: assets baked into the image at the mountpoint (e.g.
  `/data/...`) are hidden once the empty volume mounts over `/data`. Bake assets
  at a different path (`/opt/app/...`) and symlink/copy them in via the entrypoint.
- **Cross-arch cgo builds are slow** (QEMU). Build native first; only build
  other arches once it works. Keep the manifest `arch` list and Makefile
  `ARCHES` in sync.
- **`jq` missing** only breaks the cosmetic build summary, not the `.s9pk`.
- **Don't edit `startos/index.ts` or `sdk.ts`** — they're plumbing; edits break
  the manifest/sdk wiring.
- **Secrets & sharing**: never commit a `.env` with real values, the developer
  key, `node_modules`, `javascript/`, or `*.s9pk`. The template `.gitignore`
  covers the artifacts; also gitignore `.claude/` before sharing publicly.

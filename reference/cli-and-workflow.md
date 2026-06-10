# CLI & Workflow Reference (StartOS 0.4.0.x)

Official docs: <https://docs.start9.com/packaging/0.4.0.x/> (read the live pages
for the latest; recipe slugs are under `.../0.4.0.x/recipes/<slug>.html`).

## Tooling required
- `start-cli` — the StartOS packaging/CLI tool (v2 s9pk format). Install per
  <https://docs.start9.com>. Provides `s9pk`, `init-key`, `package`, etc.
- `docker` + buildx — images are built via `docker buildx`.
- `node` + `npm` — the SDK is a Node/TypeScript project.
- (optional) `jq` — only used to pretty-print the post-build summary. Missing
  `jq` prints `jq: not found` and blank summary fields; the `.s9pk` is fine.

## One-time setup
```sh
start-cli init-key                 # creates ~/.startos/developer.key.pem (signing key)
                                   # `make` auto-runs this if the key is missing
```
`~/.startos/config.yaml` controls install/publish targets:
```yaml
host: https://my-server.local          # required for `make install` (sideload target)
registry: https://my-registry.tld      # required for `make publish`
s9pk-s3base: https://s9pks.my-bucket.tld
```
`start-cli` reads `host`/`registry` from this file automatically.

## Scaffold manually (if not using scripts/scaffold.sh)
The template repo already contains a `.claude/` dir; clone to a temp dir and
copy in so you don't clobber an existing one:
```sh
TMP=$(mktemp -d)
git clone --depth 1 https://github.com/Start9Labs/hello-world-startos.git "$TMP/hw"
rm -rf "$TMP/hw/.git"
cp -r "$TMP/hw/." <target-dir>/
rm -rf "$TMP"
cd <target-dir>
# set the package id + title in startos/manifest/index.ts (id: '...', title: '...')
git init && git add -A && git commit -m "Initial <id> StartOS package"   # REQUIRED before build
npm install
```

## Build
```sh
npm run check          # tsc --noEmit  — type-check (fast; do this first)
npm run build          # ncc-bundle startos/index.ts -> javascript/  (make does this)
make                   # build ALL arches  -> <id>_<arch>.s9pk
make x86   # or x86_64    single arch
make arm   # or arm64/aarch64
make riscv # or riscv64
make clean
```
`make` flow: `npm run check && npm run build` → `start-cli s9pk pack` (which runs
the Docker image build declared in the manifest) → `<id>_<arch>.s9pk`.

Restrict arches by editing the first line of `Makefile`: `ARCHES := x86 arm`.
The arch list in the **Makefile** and the `arch:` list in each manifest image
should agree.

## Inspect / install / publish
```sh
start-cli s9pk inspect <file>.s9pk manifest      # dump the packed manifest (JSON)
start-cli s9pk list-ingredients                  # what pack will include
start-cli s9pk select                            # pick best s9pk for a target device
make install        # sideload the arch-matched s9pk to `host` in config.yaml
make publish        # publish to registry + s3 (needs registry/s9pk-s3base)
```
Or sideload by hand in the StartOS web UI: **System → Sideload Service** → upload
the `<id>_<arch>.s9pk` matching the server's CPU architecture.

## Environment gotchas (learned the hard way)
- **`No rule to make target '.git/index'`** → you have not committed. `s9pk.mk`
  declares the build depends on `.git/HEAD` and `.git/index`. Run an initial
  `git add -A && git commit`.
- **`permission denied ... /var/run/docker.sock`** → your shell session predates
  your `docker`-group membership (common on freshly-set-up WSL/Linux). Either
  start a new login shell, or wrap docker-invoking commands:
  `sg docker -c 'make x86'`. Verify access with `sg docker -c 'docker info'`.
- **`jq: not found`** in the build summary → cosmetic only. Inspect manifests
  with `start-cli s9pk inspect <f> manifest | python3 -m json.tool`.
- **`emulateMissingAs`/slow ARM builds** → cross-arch image builds run under
  QEMU emulation and are much slower (a cgo Go compile can go from ~10s to
  ~2min). Build the native arch first to validate, then the others.
- **PACKAGE_ID** is parsed from `startos/manifest/index.ts` via
  `awk -F"'" '/id:/ {print $2}'` — keep the `id: 'your-id'` line single-quoted.
- The release CI workflow refuses to run while the id is still `hello-world`.

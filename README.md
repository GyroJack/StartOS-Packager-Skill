# startos-packager — an agent skill

A model-agnostic **agent skill** that specializes an AI coding agent in packaging
services into StartOS 0.4.0.x `.s9pk` files using `@start9labs/start-sdk`. It
bundles the orchestrating instructions, on-demand reference docs, copy-paste
code templates, and automation scripts.

## What's inside
```
startos-packager/
├── SKILL.md                         # the brain: rules, workflow, when to read what
├── README.md                        # this file
├── reference/                       # progressive-disclosure reference (read on demand)
│   ├── cli-and-workflow.md          # start-cli/make commands, config.yaml, env gotchas
│   ├── sdk-api.md                   # full SDK API surface with signatures
│   ├── recipes.md                   # the 0.4.0.x recipe catalog → API/template map
│   └── patterns-and-pitfalls.md     # proven patterns + mistakes to avoid
├── templates/                       # copy-and-adapt sources
│   ├── Dockerfile.from-source       # build & pin from upstream repo
│   ├── Dockerfile.prebuilt          # wrap a trusted prebuilt image
│   ├── entrypoint.sh                # cd-to-volume + symlink assets + seed files
│   └── startos/                     # TypeScript package definition templates
│       ├── manifest.index.ts        → startos/manifest/index.ts
│       ├── manifest.i18n.ts         → startos/manifest/i18n.ts
│       ├── versions.current.ts      → startos/versions/current.ts
│       ├── versions.index.ts        → startos/versions/index.ts
│       ├── utils.ts                 → startos/utils.ts
│       ├── interfaces.ts            → startos/interfaces.ts
│       ├── main.ts                  → startos/main.ts   (simple)
│       ├── main.gated.ts            → startos/main.ts   (require-setup variant)
│       ├── fileModels.ts            → startos/fileModels/index.ts
│       ├── config-action.ts         → startos/actions/config.ts
│       └── wireup.ts                → split into actions/index.ts, init/index.ts,
│                                       backups.ts, dependencies.ts
└── scripts/                         # automation (POSIX/bash)
    ├── scaffold.sh                  # new package from the official template
    ├── build.sh                     # build .s9pk (handles docker-group + git-commit)
    └── preflight.sh                 # validate environment + package before build/share
```
> The `templates/startos/*.ts` filenames use dots to flatten the directory; the
> mapping above (and comments at the top of each file) show where each one goes.

## Install the skill
**Claude Code / Claude agents:** copy this folder into your skills directory so
it's discovered by name:
```sh
cp -r startos-packager ~/.claude/skills/startos-packager      # user-level
# or  <project>/.claude/skills/startos-packager                # project-level
```
Then just ask: *"package &lt;service&gt; for StartOS"* — the agent loads `SKILL.md`
via the `description` frontmatter and follows it.

**Any other agent harness:** point the agent at `SKILL.md` as its system/skill
prompt. Everything is plain Markdown + shell, so no Claude-specific runtime is
required.

## Quick start (what the skill does)
```sh
# 1. Scaffold from the official hello-world template (sets id/title, commits, npm i)
scripts/scaffold.sh my-service "My Service" ~/code/my-service-startos
cd ~/code/my-service-startos

# 2. Edit the Dockerfile + startos/*.ts using templates/ (see SKILL.md workflow)

# 3. Type-check, then build
npm run check
/path/to/startos-packager/scripts/build.sh        # produces my-service_<arch>.s9pk

# 4. Validate before sharing/sideloading
/path/to/startos-packager/scripts/preflight.sh
```

## Requirements
`start-cli`, Docker (+ buildx), Node/npm. `jq` optional (cosmetic). See
`reference/cli-and-workflow.md` for setup and the `~/.startos/config.yaml` shape.

## Notes
- Targets the **0.4.0.x** SDK (`@start9labs/start-sdk` 1.5.x), the TypeScript,
  `start-cli`-based packaging system — not the older 0.3.x Deno/`manifest.yaml`
  style.
- Always confirm a recipe's current API against the live docs
  (<https://docs.start9.com/packaging/0.4.0.x/>) — the reference here is a
  distilled, fast-path companion, not a replacement.

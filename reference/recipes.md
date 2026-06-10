# Recipe Catalog (StartOS 0.4.0.x)

The official docs organize packaging into intent-driven **recipes**. Live pages:
<https://docs.start9.com/packaging/0.4.0.x/> → "Recipes" (slugs typically
`.../0.4.0.x/recipes/<slug>.html`). Fetch the live page for the authoritative,
current code for any recipe. Below is the catalog mapped to this skill's
templates and `reference/sdk-api.md` sections, so you can pick the right pattern
fast.

## Configuration
| Recipe | What it does | Use |
| --- | --- | --- |
| **Basic Service** | Minimal single-container service: web UI + health check + backup | Start here; `templates/startos/main.ts` + `interfaces.ts` + `backups.ts` |
| **Prebuilt Docker Image** | Wrap an upstream image with mounts/init | `Dockerfile.prebuilt` + manifest `source.dockerTag` |
| **Configuration Actions** | User-driven setup via an input form | `templates/startos/config-action.ts`, sdk-api §6 |
| **Config Files** | Generate YAML/TOML/INI/JSON/ENV config | `FileHelper.{yaml,toml,ini,json,env}`, sdk-api §7 |
| **Environment Variables** | Configure service via daemon env | `exec.env` / write a `.env` via `FileHelper.env` |
| **Hardcode Config Values** | Lock ports/auth so users can't change them | omit from InputSpec, or `spec.disable(keys, msg)` |
| **Primary URL** | Let the user pick the service's main hostname | interface config, sdk-api §3 |
| **SMTP / Email** | Configurable outbound email | `sdk` SMTP input constants (`smtpShape`/`smtpPrefill`) |

## Credentials & access control
| Recipe | What it does |
| --- | --- |
| **Internal Secrets** | Auto-generate DB/app passwords (`Value.text({ generate })` / store.json) |
| **Admin Credentials** | User-created credentials with rotation |
| **Password Reset** | Regenerate + push new creds into a running app (an Action) |
| **Registration Gating** | Toggle public signups (a `Value.toggle` → config) |

## Setup & lifecycle
| Recipe | What it does | Use |
| --- | --- | --- |
| **Require Setup Before Starting** | Block startup until configured | **gating pattern** → `templates/startos/main.gated.ts`, patterns doc |
| **One-Time Install Setup** | Initial password/db seeding on install | `sdk.setupOnInit(kind==='install')` |
| **Temporary Daemon Chain** | Bootstrap via API calls during init | `Daemons.addOneshot` |
| **Version Upgrades** | Migrate data between versions | `VersionInfo.migrations.up`, sdk-api §2 |
| **Restore from Backup** | Re-register after restore | `restoreInit` from `setupBackups`, `setupOnInit(kind==='restore')` |

## Daemons & containers
| Recipe | What it does | Use |
| --- | --- | --- |
| **Multiple Containers** | App + database/cache | multiple `SubContainer`s + `addDaemon(..., { requires })` |
| **PostgreSQL Sidecar** | DB daemon + `pg_dump` backup | `Backups.withPgDump`, second image/subcontainer |
| **MySQL/MariaDB Sidecar** | DB daemon + `mysqldump` | `Backups.withMysqlDump` |
| **Redis/Valkey Cache** | Ephemeral cache + health | second daemon, health check |
| **Dynamic Daemons** | Variable daemon count from config | build `Daemons` in a loop in `main.ts` |
| **One-Shot Commands** | Migrations / pre-daemon setup | `Daemons.addOneshot` |
| **Nested OCI Runtime** | Rootless podman/docker inside the service | manifest `nestedRuntime: true` |

## Networking
| Recipe | What it does | Use |
| --- | --- | --- |
| **Web UI** | Single HTTP interface for the browser | `createInterface({ type: 'ui' })` |
| **Multiple Interfaces** | RPC / API / peer / WS / SSH ports | several `bindPort` + `createInterface` |
| **API-Only Interface** | Programmatic access, no UI | `createInterface({ type: 'api' })` |

## Dependencies
| Recipe | What it does | Use |
| --- | --- | --- |
| **Depend on Another Service** | Declare + read a dependency's connection info | manifest `dependencies` + `setupDependencies` |
| **Enforce Dependency Settings** | Require cross-service config | `sdk.checkDependencies` |
| **Mount Dependency Volumes** | Read another service's data (RO) | `Mounts.mountDependency` |
| **Alternative Dependencies** | Choose between backends | `optional: true` deps + config select |

## Data, health, comms
| Recipe | What it does | Use |
| --- | --- | --- |
| **Backup and Restore** | Volume snapshots / DB dumps / rsync | `setupBackups`, sdk-api §8 |
| **Standalone Health Checks** | Sync progress / reachability | `Daemons.addHealthCheck`, `checkWebUrl` |
| **Notifications** | Push alerts to the StartOS panel | `sdk.notification.create(...)` |

## AI-assisted packaging
The 0.4.0.x docs explicitly endorse an **intent-driven, AI-assisted** workflow:
describe *what* the service needs; let the assistant implement *how* using the
SDK. This skill is that assistant's playbook. When unsure of a recipe's exact
current API, fetch its live doc page and cross-check against `reference/sdk-api.md`.

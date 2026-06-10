#!/usr/bin/env bash
# Validate the environment AND the current package before building/sharing.
# Usage: run from the package root.  Exits non-zero if any CHECK fails.
set -uo pipefail

fail=0
ok()   { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[0;31m✗\033[0m %s\n' "$1"; fail=1; }
warn() { printf '  \033[0;33m!\033[0m %s\n' "$1"; }

echo "Environment:"
command -v start-cli >/dev/null && ok "start-cli present" || bad "start-cli missing"
command -v npm >/dev/null && ok "npm present" || bad "npm missing"
command -v docker >/dev/null && ok "docker present" || bad "docker missing"
if docker info >/dev/null 2>&1; then ok "docker daemon reachable"
elif command -v sg >/dev/null && sg docker -c 'docker info >/dev/null 2>&1'; then warn "docker reachable only via 'sg docker' (use build.sh)"
else bad "docker daemon not reachable"; fi
[ -f "$HOME/.startos/developer.key.pem" ] && ok "developer key present" || warn "no developer key (make/check-init will run 'start-cli init-key')"
command -v jq >/dev/null && ok "jq present" || warn "jq missing (cosmetic build-summary only)"

echo "Package:"
if [ -f startos/manifest/index.ts ]; then
  ok "startos/manifest/index.ts found"
  ID="$(awk -F"'" '/id:/ {print $2; exit}' startos/manifest/index.ts)"
  [ -n "$ID" ] && ok "package id = '$ID'" || bad "could not parse id from manifest"
  [ "$ID" = "hello-world" ] && bad "id is still 'hello-world' — set a real id" || true
else
  bad "not in a package root (no startos/manifest/index.ts)"
fi
[ -e .git/index ] && ok "git has at least one commit" || bad "no git commit yet (build needs .git/index)"
if [ -d node_modules ]; then ok "node_modules installed"; else warn "node_modules missing — run 'npm install'"; fi

if [ -d node_modules ] && [ -f package.json ]; then
  if npm run --silent check >/tmp/sp_tsc.log 2>&1; then ok "tsc type-check passes"
  else bad "tsc type-check FAILED — see below"; sed 's/^/      /' /tmp/sp_tsc.log; fi
fi

# Image source sanity.
if grep -q 'dockerBuild' startos/manifest/index.ts 2>/dev/null; then
  [ -f Dockerfile ] && ok "dockerBuild + Dockerfile present" || bad "manifest uses dockerBuild but no Dockerfile"
elif grep -q 'dockerTag' startos/manifest/index.ts 2>/dev/null; then
  ok "image uses a prebuilt dockerTag"
fi

# Sharing hygiene (warn only).
git ls-files 2>/dev/null | grep -qE '(^|/)\.env$' && warn "a .env file is tracked — do not commit real secrets"
git ls-files 2>/dev/null | grep -q '\.s9pk$' && warn "a .s9pk is tracked — build artifacts should be gitignored"
git ls-files 2>/dev/null | grep -q '^\.claude/' && warn ".claude/ is tracked — gitignore it before sharing publicly"

echo
if [ "$fail" -eq 0 ]; then echo "Preflight: OK"; else echo "Preflight: FAILED (fix the ✗ items)"; fi
exit "$fail"

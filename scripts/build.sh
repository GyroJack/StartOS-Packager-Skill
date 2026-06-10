#!/usr/bin/env bash
# Build a StartOS .s9pk, transparently handling the two common environment snags:
#  - the shell not being in the `docker` group yet  -> wrap with `sg docker`
#  - missing initial git commit                     -> abort with a clear message
# Usage: run from the package root.  build.sh [make-target]   (default: native arch)
set -euo pipefail

TARGET="${1:-}"

# Pick a sensible default arch target if none given.
if [ -z "$TARGET" ]; then
  case "$(uname -m)" in
    x86_64|amd64) TARGET="x86" ;;
    aarch64|arm64) TARGET="arm" ;;
    *) TARGET="" ;; # empty => `make` builds all arches
  esac
fi

# Preconditions.
command -v start-cli >/dev/null || { echo "Error: start-cli not found." >&2; exit 1; }
command -v npm >/dev/null || { echo "Error: npm not found." >&2; exit 1; }
[ -f startos/manifest/index.ts ] || { echo "Error: run from the package root (no startos/manifest/index.ts)." >&2; exit 1; }
if [ ! -e .git/index ]; then
  echo "Error: no git commit yet — the build needs one (.git/index)." >&2
  echo "Run: git init && git add -A && git commit -m 'init'" >&2
  exit 1
fi

# Decide whether we need `sg docker`.
DOCKER_PREFIX=""
if ! docker info >/dev/null 2>&1; then
  if command -v sg >/dev/null && getent group docker 2>/dev/null | grep -q "\b$(id -un)\b" \
     && sg docker -c 'docker info >/dev/null 2>&1'; then
    echo "==> Docker socket needs the docker group; using 'sg docker'."
    DOCKER_PREFIX="sg docker -c"
  else
    echo "Error: cannot access the Docker daemon. Add yourself to the 'docker' group" >&2
    echo "       (and start a new login shell), or run Docker with appropriate perms." >&2
    exit 1
  fi
fi

echo "==> Type-checking (npm run check)"
npm run check

echo "==> Building (make ${TARGET:-<all arches>})"
if [ -n "$DOCKER_PREFIX" ]; then
  $DOCKER_PREFIX "make $TARGET"
else
  make $TARGET
fi

echo
echo "==> Built artifacts:"
ls -1 ./*.s9pk 2>/dev/null || { echo "No .s9pk produced — check the output above." >&2; exit 1; }
echo
echo "Inspect a manifest with:"
echo "  start-cli s9pk inspect <file>.s9pk manifest | python3 -m json.tool"

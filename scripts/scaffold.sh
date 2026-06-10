#!/usr/bin/env bash
# Scaffold a new StartOS 0.4.0.x package from the official hello-world template.
# Usage: scaffold.sh <package-id> "<Title>" <target-dir>
# Example: scaffold.sh haven "HAVEN" ~/vibes/haven-startos
set -euo pipefail

ID="${1:-}"; TITLE="${2:-}"; DEST="${3:-}"
TEMPLATE_URL="https://github.com/Start9Labs/hello-world-startos.git"

if [ -z "$ID" ] || [ -z "$TITLE" ] || [ -z "$DEST" ]; then
  echo "Usage: $0 <package-id> \"<Title>\" <target-dir>" >&2
  exit 2
fi
case "$ID" in
  *[!a-z0-9-]*|"") echo "Error: id must be lowercase letters, digits, hyphens." >&2; exit 2;;
esac

echo "==> Cloning template into a temp dir"
TMP="$(mktemp -d)"
git clone --depth 1 "$TEMPLATE_URL" "$TMP/hw"
rm -rf "$TMP/hw/.git"

echo "==> Copying into $DEST"
mkdir -p "$DEST"
cp -r "$TMP/hw/." "$DEST/"
rm -rf "$TMP"

cd "$DEST"

echo "==> Removing template's local Claude settings (not for sharing)"
rm -rf .claude
grep -q '^\.claude/' .gitignore 2>/dev/null || printf '\n# Local Claude settings\n.claude/\n' >> .gitignore

echo "==> Setting id='$ID' and title in startos/manifest/index.ts"
# Replace the first id: '...' and title: '...' lines (template uses single quotes).
sed -i.bak -E "0,/id:[[:space:]]*'[^']*'/s//id: '$ID'/" startos/manifest/index.ts
sed -i.bak -E "0,/title:[[:space:]]*'[^']*'/s//title: '$TITLE'/" startos/manifest/index.ts
rm -f startos/manifest/index.ts.bak

echo "==> Installing npm dependencies"
npm install

echo "==> Initial git commit (REQUIRED before the first build)"
git init -q
git add -A
git -c user.email="packager@localhost" -c user.name="packager" \
    commit -q -m "Initial $ID StartOS package from hello-world template"

cat <<EOF

✅ Scaffolded $ID at $DEST

Next:
  1. Edit startos/manifest/index.ts (repos, description, images, volumes).
  2. Write the Dockerfile (templates/Dockerfile.from-source or .prebuilt).
  3. Fill in startos/{interfaces,main,fileModels,actions}.ts from templates/.
  4. cd "$DEST" && npm run check        # type-check
  5. <skill>/scripts/build.sh           # build the .s9pk
EOF

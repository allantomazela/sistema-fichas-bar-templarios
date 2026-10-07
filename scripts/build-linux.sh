#!/usr/bin/env bash
# Build nativo no Linux (sem Docker). Use em Ubuntu 22.04+ / Debian 12+.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> [Linux nativo] pnpm tauri build --bundles deb,appimage"
pnpm install
pnpm exec tauri build --bundles deb,appimage

OUT="$ROOT/dist-installers/linux"
mkdir -p "$OUT"
rm -f "$OUT"/* || true
cp -v "$ROOT"/src-tauri/target/release/bundle/deb/*.deb "$OUT/" 2>/dev/null || true
cp -v "$ROOT"/src-tauri/target/release/bundle/appimage/*.AppImage "$OUT/" 2>/dev/null || true

echo ""
echo "==> Artefatos em dist-installers/linux:"
ls -lah "$OUT" || true

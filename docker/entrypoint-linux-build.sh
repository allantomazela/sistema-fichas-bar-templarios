#!/usr/bin/env bash
set -euo pipefail

echo "==> [Linux] Instalando dependências pnpm..."
pnpm install --frozen-lockfile=false

echo "==> [Linux] Build Tauri (.deb + AppImage)..."
pnpm exec tauri build --bundles deb,appimage

echo "==> [Linux] Copiando artefatos para dist-installers/linux ..."
mkdir -p /app/dist-installers/linux
rm -rf /app/dist-installers/linux/*
shopt -s nullglob
cp -v /app/src-tauri/target/release/bundle/deb/*.deb /app/dist-installers/linux/ 2>/dev/null || true
cp -v /app/src-tauri/target/release/bundle/appimage/*.AppImage /app/dist-installers/linux/ 2>/dev/null || true

echo ""
echo "==> [Linux] Concluído. Arquivos em dist-installers/linux:"
ls -lah /app/dist-installers/linux || true

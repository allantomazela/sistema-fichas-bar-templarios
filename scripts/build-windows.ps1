#Requires -Version 5.1
<#
.SYNOPSIS
  Gera instaladores Windows (NSIS + MSI) em dist-installers/windows
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> [Windows] pnpm tauri build --bundles nsis,msi" -ForegroundColor Cyan
pnpm exec tauri build --bundles "nsis,msi"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$Out = Join-Path $Root "dist-installers\windows"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
Get-ChildItem $Out -File -ErrorAction SilentlyContinue | Remove-Item -Force

$Nsis = Join-Path $Root "src-tauri\target\release\bundle\nsis\*.exe"
$Msi = Join-Path $Root "src-tauri\target\release\bundle\msi\*.msi"
Copy-Item $Nsis $Out -ErrorAction SilentlyContinue
Copy-Item $Msi $Out -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==> [Windows] Artefatos em dist-installers\windows:" -ForegroundColor Green
Get-ChildItem $Out | ForEach-Object { Write-Host ("  - " + $_.Name) }

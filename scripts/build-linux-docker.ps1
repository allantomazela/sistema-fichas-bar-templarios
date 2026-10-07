#Requires -Version 5.1
<#
.SYNOPSIS
  Gera pacotes Linux (.deb + AppImage) via Docker, sem misturar com o build Windows.
  Pre-requisito: Docker Desktop rodando.
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$compose = Join-Path $Root "docker\docker-compose.linux-build.yml"
if (-not (Test-Path $compose)) {
  Write-Error "Arquivo nao encontrado: $compose"
}

Write-Host "==> [Linux] Build via Docker (Ubuntu 22.04) - .deb + AppImage" -ForegroundColor Cyan
Write-Host "    Primeira execucao pode demorar (imagem + Rust)." -ForegroundColor DarkGray

docker compose -f $compose run --rm linux-build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$Out = Join-Path $Root "dist-installers\linux"
Write-Host ""
Write-Host "==> [Linux] Artefatos em dist-installers\linux:" -ForegroundColor Green
if (Test-Path $Out) {
  Get-ChildItem $Out | ForEach-Object { Write-Host ("  - " + $_.Name) }
} else {
  Write-Warning "Pasta dist-installers\linux nao encontrada. Veja o log do Docker."
}

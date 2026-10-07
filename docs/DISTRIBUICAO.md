# Distribuição — Windows e Linux (separados)

Versão do app: **1.0.0**

Os instaladores ficam em pastas **separadas**:

| Pasta | Conteúdo |
| --- | --- |
| `dist-installers/windows/` | `.exe` (NSIS) e `.msi` |
| `dist-installers/linux/` | `.deb` e `.AppImage` |

---

## 1) Build Windows (neste PC)

### Pré-requisitos
- Node.js 18+ e pnpm
- Rust stable
- Visual Studio Build Tools (MSVC)

### Comando

```powershell
cd D:\Aplicativos\sistema-fichas-bar-templarios
pnpm install
pnpm tauri:build:windows
```

### Resultado
- `dist-installers\windows\Sistema Fichas Bar Templarios_1.0.0_x64-setup.exe`
- `dist-installers\windows\Sistema Fichas Bar Templarios_1.0.0_x64_en-US.msi`

Use o **`.exe` (NSIS)** na maioria dos terminais Windows.

---

## 2) Build Linux (a partir do Windows, via Docker)

Não dá para gerar `.deb` / AppImage nativamente no Windows. O jeito eficiente é Docker (Ubuntu 22.04).

### Pré-requisitos
- **Docker Desktop** instalado e **ligado**

### Comando

```powershell
cd D:\Aplicativos\sistema-fichas-bar-templarios
pnpm tauri:build:linux
```

Na primeira vez pode demorar (baixa a imagem Ubuntu, instala Rust/Node e compila). As seguintes usam cache e ficam bem mais rápidas.

### Resultado
- `dist-installers\linux\*.deb`
- `dist-installers\linux\*.AppImage`

### Em cada PC Linux
- **`.deb`** (Ubuntu/Debian):
  ```bash
  sudo apt install ./nome-do-pacote.deb
  ```
- **AppImage** (qualquer distro):
  ```bash
  chmod a+x *.AppImage
  ./nome.AppImage
  ```

Configure a impressora térmica no **CUPS** e selecione no app (Configurações → ESC/POS).

---

## 3) Build Linux nativo (só se você estiver em um Linux)

```bash
# deps (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libfuse2

pnpm install
pnpm tauri:build:linux:native
```

---

## Resumo rápido

| Objetivo | Comando |
| --- | --- |
| Só Windows | `pnpm tauri:build:windows` |
| Só Linux (Docker no Windows) | `pnpm tauri:build:linux` |
| Só Linux (máquina Linux) | `pnpm tauri:build:linux:native` |

Os dois fluxos **não se misturam**: cada um grava na sua pasta em `dist-installers/`.

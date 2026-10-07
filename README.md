# Sistema de Fichas — Bar Templários

PDV **nativo** (Windows e Linux) para emissão de fichas térmicas, controle de caixa e catálogo de produtos. Os dados ficam em **banco SQLite local** no disco da máquina — sem servidor e sem nuvem.

Evento padrão: **Show de Prêmios** · Organização: **Templários da Paz**.

## Plataformas

| SO | Empacotamento | Banco local |
| --- | --- | --- |
| **Windows** | instalador NSIS / MSI | `%APPDATA%\br.org.templariosdapaz.fichas\` → `templarios_pdv.db` |
| **Linux** | `.deb` / AppImage | `~/.config/br.org.templariosdapaz.fichas/` → `templarios_pdv.db` |

Guia completo de instaladores (Windows **e** Linux separados): **[docs/DISTRIBUICAO.md](docs/DISTRIBUICAO.md)**.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + Shadcn UI
- **Tauri 2** (Windows / Linux)
- **SQLite** (`@tauri-apps/plugin-sql`) — arquivo `templarios_pdv.db`

## Pré-requisitos

### Frontend (sempre)

- Node.js 18+
- pnpm 10+

### App nativo (Tauri)

- [Rust](https://www.rust-lang.org/tools/install) (stable) + Cargo
- **Windows:** [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (já vem no Windows 10/11 recente) + ferramentas de build MSVC (Visual Studio Build Tools)
- **Linux:** dependências do WebKitGTK / Tauri, por exemplo no Debian/Ubuntu:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libfuse2
```

Documentação oficial: [Tauri — Prerequisites](https://v2.tauri.app/start/prerequisites/).

## Instalação

```bash
pnpm install
```

### Modo browser (rápido)

```bash
pnpm dev
```

Abre em [http://127.0.0.1:5173](http://127.0.0.1:5173). Dados em `localStorage`.

### Modo nativo (produção / caixa do evento)

```bash
pnpm tauri:dev
```

Sobe o Vite + janela nativa com SQLite.

### Build de instaladores (separados)

```powershell
# Windows → dist-installers/windows/
pnpm tauri:build:windows

# Linux via Docker → dist-installers/linux/
pnpm tauri:build:linux
```

## Scripts

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | UI no navegador (localStorage) |
| `pnpm tauri:dev` | App nativo + hot reload + SQLite |
| `pnpm tauri:build:windows` | Instaladores Windows (NSIS + MSI) |
| `pnpm tauri:build:linux` | Pacotes Linux via Docker (.deb + AppImage) |
| `pnpm tauri:build:linux:native` | Pacotes Linux em máquina Linux |
| `pnpm build` | Só o frontend (Vite) |
| `pnpm lint` | Oxlint |
| `pnpm format` | Oxfmt |

## Banco de dados local

- Engine: **SQLite**
- Arquivo: `templarios_pdv.db`
- Tabela `kv_store` (chave/valor JSON) para config, catálogo, caixas, vendas e fichas
- Na primeira abertura nativa, se existir histórico no `localStorage` do WebView, os dados são **migrados** automaticamente para o SQLite
- Backup/restauração JSON continua disponível em Configurações

## Rotas

- `/` — PDV e emissão de fichas
- `/caixa` — Abertura, fechamento, sangria e suprimento
- `/produtos` — Catálogo de produtos e categorias
- `/relatorios` — Relatórios do evento
- `/dashboard` — Visão geral
- `/configuracoes` — Configurações do evento e da impressão

Senha administrativa padrão: `1234` (alterável em Configurações). Após alterar, a senha antiga deixa de funcionar.

## Impressão térmica

Após finalizar a venda, as fichas são enviadas à impressora (1 ficha = 1 página, para picote/corte por unidade). Configure o driver da térmica (80 mm) com opção de cortar a cada página quando disponível.

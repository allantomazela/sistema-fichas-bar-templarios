mod print_escpos;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create kv_store for local PDV persistence",
            sql: "CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
              );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create domain tables for catalog sales and tickets",
            sql: "
              CREATE TABLE IF NOT EXISTS categorias (
                id TEXT PRIMARY KEY NOT NULL,
                nome TEXT NOT NULL,
                ordem INTEGER NOT NULL DEFAULT 0,
                ativa INTEGER NOT NULL DEFAULT 1,
                json TEXT NOT NULL
              );
              CREATE TABLE IF NOT EXISTS produtos (
                id TEXT PRIMARY KEY NOT NULL,
                nome TEXT NOT NULL,
                categoria_id TEXT,
                preco REAL NOT NULL DEFAULT 0,
                ativo INTEGER NOT NULL DEFAULT 1,
                json TEXT NOT NULL
              );
              CREATE TABLE IF NOT EXISTS caixas (
                id TEXT PRIMARY KEY NOT NULL,
                operador TEXT,
                status TEXT NOT NULL,
                abertura TEXT,
                fechamento TEXT,
                json TEXT NOT NULL
              );
              CREATE TABLE IF NOT EXISTS movimentacoes (
                id TEXT PRIMARY KEY NOT NULL,
                caixa_id TEXT NOT NULL,
                tipo TEXT NOT NULL,
                valor REAL NOT NULL,
                data_hora TEXT,
                json TEXT NOT NULL
              );
              CREATE TABLE IF NOT EXISTS vendas (
                id TEXT PRIMARY KEY NOT NULL,
                sequencial INTEGER NOT NULL,
                caixa_id TEXT,
                operador TEXT,
                data_hora TEXT,
                total REAL NOT NULL DEFAULT 0,
                forma_pagamento TEXT,
                status TEXT NOT NULL,
                json TEXT NOT NULL
              );
              CREATE TABLE IF NOT EXISTS fichas (
                id TEXT PRIMARY KEY NOT NULL,
                venda_id TEXT NOT NULL,
                sequencial INTEGER NOT NULL,
                produto_id TEXT,
                produto_nome TEXT,
                status TEXT NOT NULL,
                data_emissao TEXT,
                caixa_id TEXT,
                json TEXT NOT NULL
              );
              CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
              CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa ON movimentacoes(caixa_id);
              CREATE INDEX IF NOT EXISTS idx_vendas_caixa ON vendas(caixa_id);
              CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
              CREATE INDEX IF NOT EXISTS idx_fichas_venda ON fichas(venda_id);
              CREATE INDEX IF NOT EXISTS idx_fichas_caixa ON fichas(caixa_id);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "store lists one row per item (see src/services/rowStore.ts)",
            sql: "CREATE TABLE IF NOT EXISTS kv_rows (
                key TEXT NOT NULL,
                pos INTEGER NOT NULL,
                json TEXT NOT NULL,
                PRIMARY KEY (key, pos)
              );",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:templarios_pdv.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            print_escpos::list_printers,
            print_escpos::print_raw
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

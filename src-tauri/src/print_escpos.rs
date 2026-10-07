//! Impressão RAW ESC/POS (Elgin i9 e compatíveis) via spooler do SO.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct PrinterInfo {
    pub name: String,
    pub is_default: bool,
}

#[cfg(windows)]
mod win {
    use super::PrinterInfo;
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::core::{PCWSTR, PWSTR};
    use windows::Win32::Graphics::Printing::{
        ClosePrinter, EndDocPrinter, EndPagePrinter, EnumPrintersW, GetDefaultPrinterW,
        OpenPrinterW, StartDocPrinterW, StartPagePrinter, WritePrinter, DOC_INFO_1W,
        PRINTER_ENUM_CONNECTIONS, PRINTER_ENUM_LOCAL, PRINTER_HANDLE, PRINTER_INFO_2W,
    };

    fn to_wide(s: &str) -> Vec<u16> {
        OsStr::new(s).encode_wide().chain(std::iter::once(0)).collect()
    }

    pub fn list_printers() -> Result<Vec<PrinterInfo>, String> {
        unsafe {
            let mut needed: u32 = 0;
            let mut returned: u32 = 0;
            let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;

            let _ = EnumPrintersW(flags, PCWSTR::null(), 2, None, &mut needed, &mut returned);

            if needed == 0 {
                return Ok(Vec::new());
            }

            let mut buffer = vec![0u8; needed as usize];
            EnumPrintersW(
                flags,
                PCWSTR::null(),
                2,
                Some(&mut buffer),
                &mut needed,
                &mut returned,
            )
            .map_err(|e| format!("Falha ao listar impressoras: {e}"))?;

            let info_ptr = buffer.as_ptr() as *const PRINTER_INFO_2W;
            let mut printers = Vec::with_capacity(returned as usize);
            let default_name = get_default_printer_name();

            for i in 0..returned as isize {
                let info = &*info_ptr.offset(i);
                if info.pPrinterName.is_null() {
                    continue;
                }
                let name = info.pPrinterName.to_string().unwrap_or_default();
                if name.is_empty() {
                    continue;
                }
                let is_default = default_name
                    .as_ref()
                    .map(|d| d.eq_ignore_ascii_case(&name))
                    .unwrap_or(false);
                printers.push(PrinterInfo { name, is_default });
            }

            if printers.iter().all(|p| !p.is_default) {
                if let Some(first) = printers.first_mut() {
                    first.is_default = true;
                }
            }

            printers.sort_by(|a, b| {
                let score = |p: &PrinterInfo| {
                    let n = p.name.to_lowercase();
                    if n.contains("elgin") && n.contains("i9") {
                        0
                    } else if n.contains("i9") {
                        1
                    } else if n.contains("elgin") {
                        2
                    } else if p.is_default {
                        3
                    } else {
                        4
                    }
                };
                score(a).cmp(&score(b)).then_with(|| a.name.cmp(&b.name))
            });

            Ok(printers)
        }
    }

    fn get_default_printer_name() -> Option<String> {
        unsafe {
            let mut size: u32 = 0;
            let _ = GetDefaultPrinterW(None, &mut size);
            if size == 0 {
                return None;
            }
            let mut buf = vec![0u16; size as usize];
            if GetDefaultPrinterW(Some(PWSTR(buf.as_mut_ptr())), &mut size).as_bool() {
                let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
                Some(String::from_utf16_lossy(&buf[..len]))
            } else {
                None
            }
        }
    }

    pub fn print_raw(printer_name: &str, data: &[u8]) -> Result<(), String> {
        if printer_name.trim().is_empty() {
            return Err("Nome da impressora vazio.".into());
        }
        if data.is_empty() {
            return Err("Nenhum dado para imprimir.".into());
        }

        unsafe {
            let mut wide_name = to_wide(printer_name);
            let mut handle = PRINTER_HANDLE::default();
            OpenPrinterW(PCWSTR(wide_name.as_mut_ptr()), &mut handle as *mut _, None).map_err(
                |e| {
                    format!(
                        "Não foi possível abrir a impressora \"{printer_name}\". Verifique se a Elgin i9 está ligada e instalada no Windows. Detalhe: {e}"
                    )
                },
            )?;

            let mut doc_name = to_wide("Fichas PDV Templarios");
            let mut datatype = to_wide("RAW");
            let doc_info = DOC_INFO_1W {
                pDocName: PWSTR(doc_name.as_mut_ptr()),
                pOutputFile: PWSTR::null(),
                pDatatype: PWSTR(datatype.as_mut_ptr()),
            };

            let job_id = StartDocPrinterW(handle, 1, &doc_info);
            if job_id == 0 {
                let _ = ClosePrinter(handle);
                return Err(
                    "Falha ao iniciar documento RAW. Confirme o driver da Elgin i9 no Windows."
                        .into(),
                );
            }

            if !StartPagePrinter(handle).as_bool() {
                let _ = EndDocPrinter(handle);
                let _ = ClosePrinter(handle);
                return Err("Falha ao iniciar página de impressão RAW.".into());
            }

            let mut written: u32 = 0;
            let ok = WritePrinter(
                handle,
                data.as_ptr() as *const core::ffi::c_void,
                data.len() as u32,
                &mut written,
            )
            .as_bool();

            let _ = EndPagePrinter(handle);
            let _ = EndDocPrinter(handle);
            let _ = ClosePrinter(handle);

            if !ok || written as usize != data.len() {
                return Err(format!(
                    "Escrita incompleta na impressora (enviados {written} de {} bytes).",
                    data.len()
                ));
            }

            Ok(())
        }
    }
}

#[cfg(not(windows))]
mod unix {
    use super::PrinterInfo;
    use std::io::Write;
    use std::process::{Command, Stdio};

    pub fn list_printers() -> Result<Vec<PrinterInfo>, String> {
        let output = Command::new("lpstat")
            .arg("-a")
            .output()
            .map_err(|e| format!("lpstat indisponível: {e}"))?;
        let text = String::from_utf8_lossy(&output.stdout);
        let mut printers = Vec::new();
        for line in text.lines() {
            let name = line.split_whitespace().next().unwrap_or("").to_string();
            if !name.is_empty() {
                printers.push(PrinterInfo {
                    name,
                    is_default: false,
                });
            }
        }
        if let Some(first) = printers.first_mut() {
            first.is_default = true;
        }
        Ok(printers)
    }

    pub fn print_raw(printer_name: &str, data: &[u8]) -> Result<(), String> {
        let mut child = Command::new("lp")
            .args(["-d", printer_name, "-o", "raw"])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Falha ao chamar lp: {e}"))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(data)
                .map_err(|e| format!("Falha ao enviar dados RAW: {e}"))?;
        }

        let status = child
            .wait_with_output()
            .map_err(|e| format!("Falha ao aguardar lp: {e}"))?;

        if !status.status.success() {
            let err = String::from_utf8_lossy(&status.stderr);
            return Err(format!("lp retornou erro: {err}"));
        }
        Ok(())
    }
}

#[tauri::command]
pub fn list_printers() -> Result<Vec<PrinterInfo>, String> {
    #[cfg(windows)]
    {
        win::list_printers()
    }
    #[cfg(not(windows))]
    {
        unix::list_printers()
    }
}

#[tauri::command]
pub fn print_raw(printer_name: String, data: Vec<u8>) -> Result<(), String> {
    #[cfg(windows)]
    {
        win::print_raw(&printer_name, &data)
    }
    #[cfg(not(windows))]
    {
        unix::print_raw(&printer_name, &data)
    }
}

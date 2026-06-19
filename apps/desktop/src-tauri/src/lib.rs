use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

#[derive(Serialize)]
struct PingResult {
    ok: bool,
    rtt_ms: u128,
}

#[derive(Deserialize, Serialize)]
struct ConnectionBootstrap {
    target: Option<String>,
    token: Option<String>,
    route: Option<String>,
}

#[tauri::command]
fn connection_bootstrap() -> Result<Option<ConnectionBootstrap>, String> {
    match std::env::var("RED_UI_CONNECTION_BOOTSTRAP") {
        Ok(raw) if raw.trim().is_empty() => Ok(None),
        Ok(raw) => serde_json::from_str::<ConnectionBootstrap>(&raw)
            .map(Some)
            .map_err(|e| e.to_string()),
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn tcp_ping(host: String, port: u16) -> Result<PingResult, String> {
    let start = std::time::Instant::now();
    let mut stream = TcpStream::connect((host.as_str(), port))
        .await
        .map_err(|e| e.to_string())?;
    stream
        .write_all(b"PING\r\n")
        .await
        .map_err(|e| e.to_string())?;
    let mut buf = [0u8; 64];
    let _ = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
    Ok(PingResult {
        ok: true,
        rtt_ms: start.elapsed().as_millis(),
    })
}

// OS keychain bridge for the EncryptedStore (issue #5). Three commands —
// set, get, delete — wrap the `keyring` crate so the JS layer (via
// TauriEncryptedStore) never touches platform-specific code paths.
//
// `get` returns Option<String>; missing entries resolve to null on the JS
// side rather than throwing, matching the WebEncryptedStore contract.

#[tauri::command]
fn keychain_set(service: String, key: String, value: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, &key).map_err(|e| e.to_string())?;
    entry.set_password(&value).map_err(|e| e.to_string())
}

#[tauri::command]
fn keychain_get(service: String, key: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(&service, &key).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn keychain_delete(service: String, key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, &key).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn docker_exec(container: String, cmd: Vec<String>) -> Result<String, String> {
    let output = tokio::process::Command::new("docker")
        .arg("exec")
        .arg(&container)
        .args(&cmd)
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

// Embedded file-backed reddb (the desktop-only "open a .rdb file" capability).
// The webview can't open a database file directly, so the Tauri shell spawns
// the bundled `red` sidecar as a local server pointed at the file, and the UI
// connects to it over plain HTTP on 127.0.0.1 — reusing the entire HTTP client
// unchanged. One process per canonical path; reused on reconnect; all killed
// on app exit.
struct Embedded {
    url: String,
    child: CommandChild,
}

#[derive(Default)]
struct EmbeddedRegistry(Mutex<HashMap<String, Embedded>>);

/// Resolve a user-typed path (from a `file://` URL) to an absolute path. `~`
/// and relative paths resolve against `$HOME`, so `file://./test.rdb` opens
/// `~/test.rdb` — a predictable base for a GUI app whose cwd is unspecified.
fn resolve_embedded_path(input: &str) -> Result<String, String> {
    let raw = input.trim();
    let raw = raw.strip_prefix("file://").unwrap_or(raw);
    let home = || std::env::var("HOME").map_err(|_| "HOME not set".to_string());
    let expanded = if let Some(rest) = raw.strip_prefix("~/") {
        format!("{}/{}", home()?, rest)
    } else {
        raw.to_string()
    };
    let path = std::path::Path::new(&expanded);
    let abs = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::path::Path::new(&home()?).join(expanded.trim_start_matches("./"))
    };
    Ok(abs.to_string_lossy().to_string())
}

/// Grab an ephemeral local port by binding `:0` and reading it back.
fn free_local_port() -> Result<u16, String> {
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .map_err(|e| e.to_string())
}

/// Poll `GET /stats` on the embedded server until it answers 200 (it is the
/// canonical proof-of-life for reddb) or the deadline passes.
async fn wait_until_ready(bind: &str) -> Result<(), String> {
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(20);
    loop {
        if std::time::Instant::now() > deadline {
            return Err("embedded reddb did not become ready within 20s".to_string());
        }
        if let Ok(mut stream) = TcpStream::connect(bind).await {
            let req =
                format!("GET /stats HTTP/1.0\r\nHost: {bind}\r\nConnection: close\r\n\r\n");
            if stream.write_all(req.as_bytes()).await.is_ok() {
                let mut buf = [0u8; 32];
                if let Ok(n) = stream.read(&mut buf).await {
                    if String::from_utf8_lossy(&buf[..n]).contains(" 200") {
                        return Ok(());
                    }
                }
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }
}

/// Open (or reuse) an embedded file-backed reddb and return its local HTTP URL.
#[tauri::command]
async fn open_embedded(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let abs = resolve_embedded_path(&path)?;

    // Reuse an already-running server for the same file.
    if let Some(existing) = app
        .state::<EmbeddedRegistry>()
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .get(&abs)
        .map(|e| e.url.clone())
    {
        return Ok(existing);
    }

    let port = free_local_port()?;
    let bind = format!("127.0.0.1:{port}");
    let url = format!("http://{bind}");

    let args = ["server", "--path", abs.as_str(), "--http-bind", bind.as_str()];
    let shell = app.shell();
    // Prefer the bundled sidecar (production). In `tauri dev` the sidecar binary
    // isn't copied next to the dev executable, so fall back to `red` on PATH.
    // `RED_HTTP_TLS_DEV=1` lets reddb serve plain HTTP on 127.0.0.1.
    let sidecar_spawn = shell
        .sidecar("red")
        .ok()
        .map(|cmd| cmd.args(args).env("RED_HTTP_TLS_DEV", "1").spawn());
    let (mut rx, child) = match sidecar_spawn {
        Some(Ok(pair)) => pair,
        _ => shell
            .command("red")
            .args(args)
            .env("RED_HTTP_TLS_DEV", "1")
            .spawn()
            .map_err(|e| {
                format!("failed to spawn `red` (bundled sidecar and PATH both unavailable): {e}")
            })?,
    };

    // Drain the sidecar's output channel so its pipe never fills and blocks.
    tauri::async_runtime::spawn(async move { while rx.recv().await.is_some() {} });

    if let Err(e) = wait_until_ready(&bind).await {
        let _ = child.kill();
        return Err(e);
    }

    app.state::<EmbeddedRegistry>()
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .insert(abs, Embedded { url: url.clone(), child });
    Ok(url)
}

/// Stop the embedded server backing `path`, if one is running.
#[tauri::command]
fn close_embedded(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let abs = resolve_embedded_path(&path)?;
    if let Some(embedded) = app
        .state::<EmbeddedRegistry>()
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .remove(&abs)
    {
        let _ = embedded.child.kill();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .manage(EmbeddedRegistry::default())
        .setup(|app| {
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls: Vec<String> = event.urls().into_iter().map(|u| u.to_string()).collect();
                let _ = handle.emit("deep-link", urls);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            connection_bootstrap,
            tcp_ping,
            docker_exec,
            keychain_set,
            keychain_get,
            keychain_delete,
            open_embedded,
            close_embedded,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Reap any embedded reddb sidecars when the app exits so we never
            // leak a file-backed server holding the database open.
            if let tauri::RunEvent::Exit = event {
                if let Some(registry) = app_handle.try_state::<EmbeddedRegistry>() {
                    if let Ok(mut map) = registry.0.lock() {
                        for (_, embedded) in map.drain() {
                            let _ = embedded.child.kill();
                        }
                    }
                }
            }
        });
}

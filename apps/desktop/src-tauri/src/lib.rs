use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

/// Serializable error shape returned by every desktop command (#115). Tauri
/// serializes an `Err` value to JSON and `invoke` rejects with it, so a
/// structured `{ code, message, detail? }` lets the frontend classify failures
/// in one place instead of coercing bare strings. `code` is a stable machine
/// token; `message` is human-readable; `detail` carries the underlying cause
/// (an OS/keyring/serde message) when there is one.
#[derive(Serialize, Debug, Clone, PartialEq)]
struct CommandError {
    code: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<String>,
}

impl CommandError {
    fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
            detail: None,
        }
    }

    fn with_detail(code: &str, message: impl Into<String>, detail: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
            detail: Some(detail.into()),
        }
    }
}

/// A poisoned registry mutex is an internal invariant break, not a user error.
fn lock_err<E: std::fmt::Display>(e: E) -> CommandError {
    CommandError::with_detail("INTERNAL", "embedded registry lock poisoned", e.to_string())
}

/// Any keyring failure other than a missing entry (which callers handle as a
/// normal `None`) maps to a single keychain code with the OS cause attached.
fn keychain_err(e: keyring::Error) -> CommandError {
    CommandError::with_detail("KEYCHAIN", "keychain operation failed", e.to_string())
}

#[derive(Deserialize, Serialize)]
struct ConnectionBootstrap {
    target: Option<String>,
    token: Option<String>,
    route: Option<String>,
}

#[tauri::command]
fn connection_bootstrap() -> Result<Option<ConnectionBootstrap>, CommandError> {
    match std::env::var("RED_UI_CONNECTION_BOOTSTRAP") {
        Ok(raw) if raw.trim().is_empty() => Ok(None),
        Ok(raw) => serde_json::from_str::<ConnectionBootstrap>(&raw)
            .map(Some)
            .map_err(|e| {
                CommandError::with_detail(
                    "BOOTSTRAP_PARSE",
                    "failed to parse connection bootstrap payload",
                    e.to_string(),
                )
            }),
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(e) => Err(CommandError::with_detail(
            "BOOTSTRAP_ENV",
            "failed to read connection bootstrap environment variable",
            e.to_string(),
        )),
    }
}

// OS keychain bridge for the EncryptedStore (issue #5). Three commands —
// set, get, delete — wrap the `keyring` crate so the JS layer (via
// TauriEncryptedStore) never touches platform-specific code paths.
//
// `get` returns Option<String>; missing entries resolve to null on the JS
// side rather than throwing, matching the WebEncryptedStore contract.

#[tauri::command]
fn keychain_set(service: String, key: String, value: String) -> Result<(), CommandError> {
    let entry = keyring::Entry::new(&service, &key).map_err(keychain_err)?;
    entry.set_password(&value).map_err(keychain_err)
}

#[tauri::command]
fn keychain_get(service: String, key: String) -> Result<Option<String>, CommandError> {
    let entry = keyring::Entry::new(&service, &key).map_err(keychain_err)?;
    match entry.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(keychain_err(e)),
    }
}

#[tauri::command]
fn keychain_delete(service: String, key: String) -> Result<(), CommandError> {
    let entry = keyring::Entry::new(&service, &key).map_err(keychain_err)?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(keychain_err(e)),
    }
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
fn resolve_embedded_path(input: &str) -> Result<String, CommandError> {
    let raw = input.trim();
    let raw = raw.strip_prefix("file://").unwrap_or(raw);
    let home = || {
        std::env::var("HOME")
            .map_err(|_| CommandError::new("PATH_RESOLUTION", "HOME environment variable is not set"))
    };
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
fn free_local_port() -> Result<u16, CommandError> {
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .map_err(|e| {
            CommandError::with_detail("PORT_UNAVAILABLE", "could not allocate a local port", e.to_string())
        })
}

/// Poll `GET /stats` on the embedded server until it answers 200 (it is the
/// canonical proof-of-life for reddb) or the deadline passes.
async fn wait_until_ready(bind: &str) -> Result<(), CommandError> {
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(20);
    loop {
        if std::time::Instant::now() > deadline {
            return Err(CommandError::new(
                "EMBEDDED_TIMEOUT",
                "embedded reddb did not become ready within 20s",
            ));
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
async fn open_embedded(app: tauri::AppHandle, path: String) -> Result<String, CommandError> {
    let abs = resolve_embedded_path(&path)?;

    // Reuse an already-running server for the same file.
    if let Some(existing) = app
        .state::<EmbeddedRegistry>()
        .0
        .lock()
        .map_err(lock_err)?
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
                CommandError::with_detail(
                    "SIDECAR_SPAWN",
                    "failed to spawn `red` (bundled sidecar and PATH both unavailable)",
                    e.to_string(),
                )
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
        .map_err(lock_err)?
        .insert(abs, Embedded { url: url.clone(), child });
    Ok(url)
}

/// Stop the embedded server backing `path`, if one is running.
#[tauri::command]
fn close_embedded(app: tauri::AppHandle, path: String) -> Result<(), CommandError> {
    let abs = resolve_embedded_path(&path)?;
    if let Some(embedded) = app
        .state::<EmbeddedRegistry>()
        .0
        .lock()
        .map_err(lock_err)?
        .remove(&abs)
    {
        let _ = embedded.child.kill();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Single-instance guard: a second launch focuses the running window and
        // forwards any URL arguments as a "deep-link" event so the frontend
        // handler picks them up the same way macOS does via on_open_url.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            // argv[0] is the executable path; skip it and forward any URL args.
            let urls: Vec<String> = argv
                .into_iter()
                .skip(1)
                .filter(|a| {
                    a.starts_with("red://")
                        || a.starts_with("reds://")
                        || a.starts_with("red+tls://")
                        || a.starts_with("red+tcp://")
                        || a.starts_with("red+unix://")
                })
                .collect();
            if !urls.is_empty() {
                let _ = app.emit("deep-link", urls);
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_error_serializes_without_detail() {
        let err = CommandError::new("KEYCHAIN", "keychain operation failed");
        let json = serde_json::to_value(&err).expect("serializable");
        assert_eq!(json["code"], "KEYCHAIN");
        assert_eq!(json["message"], "keychain operation failed");
        // `detail` is skipped entirely when absent, not emitted as null — the
        // frontend classifier treats a present key as a real cause.
        assert!(json.get("detail").is_none());
    }

    #[test]
    fn command_error_serializes_with_detail() {
        let err = CommandError::with_detail(
            "EMBEDDED_TIMEOUT",
            "embedded reddb did not become ready",
            "20s elapsed",
        );
        let json = serde_json::to_value(&err).expect("serializable");
        assert_eq!(json["code"], "EMBEDDED_TIMEOUT");
        assert_eq!(json["message"], "embedded reddb did not become ready");
        assert_eq!(json["detail"], "20s elapsed");
    }

    #[test]
    fn command_error_json_shape_is_stable() {
        let err = CommandError::new("INTERNAL", "boom");
        let s = serde_json::to_string(&err).expect("serializable");
        assert_eq!(s, r#"{"code":"INTERNAL","message":"boom"}"#);
    }

    #[test]
    fn keychain_err_maps_no_entry_cause_into_detail() {
        let err = keychain_err(keyring::Error::NoEntry);
        assert_eq!(err.code, "KEYCHAIN");
        assert_eq!(err.message, "keychain operation failed");
        assert!(err.detail.is_some());
    }

    #[test]
    fn resolve_embedded_path_absolute_is_untouched() {
        let resolved = resolve_embedded_path("file:///tmp/data.rdb").expect("absolute path");
        assert_eq!(resolved, "/tmp/data.rdb");
    }
}

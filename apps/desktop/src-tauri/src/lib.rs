use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

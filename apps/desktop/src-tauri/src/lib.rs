use serde::Serialize;
use tauri::{Emitter, Manager};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

#[derive(Serialize)]
struct PingResult {
    ok: bool,
    rtt_ms: u128,
}

#[tauri::command]
async fn tcp_ping(host: String, port: u16) -> Result<PingResult, String> {
    let start = std::time::Instant::now();
    let mut stream = TcpStream::connect((host.as_str(), port))
        .await
        .map_err(|e| e.to_string())?;
    stream.write_all(b"PING\r\n").await.map_err(|e| e.to_string())?;
    let mut buf = [0u8; 64];
    let _ = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
    Ok(PingResult { ok: true, rtt_ms: start.elapsed().as_millis() })
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
        .invoke_handler(tauri::generate_handler![tcp_ping, docker_exec])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

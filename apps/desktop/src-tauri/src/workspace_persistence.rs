//! Private app-data RedDB lifecycle. Neither loopback address, bearer token nor
//! Vault opening credential crosses the webview IPC boundary.
use super::CommandError;
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
    time::Duration,
};
use tauri::Manager;
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use zeroize::Zeroizing;

const KEYCHAIN_SERVICE: &str = "io.reddb.red-ui.workspace.v1";

#[derive(Default)]
pub struct WorkspaceRegistry(tokio::sync::Mutex<RegistryState>);

#[derive(Default)]
struct RegistryState {
    databases: HashMap<String, PrivateDatabase>,
    locked: HashSet<String>,
}

struct PrivateDatabase {
    port: u16,
    token: Zeroizing<String>,
    child: CommandChild,
    owners: HashSet<String>,
}

fn failure(message: &str) -> CommandError {
    CommandError::new("WORKSPACE_PERSISTENCE", message)
}

fn transport_failure(message: &str) -> CommandError {
    CommandError::new("WORKSPACE_PROCESS", message)
}

fn profile_id(profile: &str) -> Result<String, CommandError> {
    if profile.is_empty() || profile.len() > 4096 {
        return Err(failure("Invalid persistence profile"));
    }
    Ok(Sha256::digest(profile.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}

fn private_path(app: &tauri::AppHandle, id: &str) -> Result<PathBuf, CommandError> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|_| failure("App data directory is unavailable"))?
        .join("workspaces-v1");
    std::fs::create_dir_all(&directory)
        .map_err(|_| failure("Could not create private workspace directory"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&directory, std::fs::Permissions::from_mode(0o700))
            .map_err(|_| failure("Could not protect private workspace directory"))?;
    }
    Ok(directory.join(format!("{id}.rdb")))
}

fn opening_credential(id: &str, create: bool) -> Result<Option<Zeroizing<String>>, CommandError> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, id).map_err(super::keychain_err)?;
    match entry.get_password() {
        Ok(password) => Ok(Some(Zeroizing::new(password))),
        Err(keyring::Error::NoEntry) if create => {
            let mut bytes = Zeroizing::new([0u8; 32]);
            getrandom::fill(bytes.as_mut())
                .map_err(|_| failure("Secure random source is unavailable"))?;
            let password = Zeroizing::new(
                bytes
                    .iter()
                    .map(|byte| format!("{byte:02x}"))
                    .collect::<String>(),
            );
            // Save before initializing the Vault. Failure never creates an
            // encrypted database whose opening credential cannot be recovered.
            entry.set_password(&password).map_err(super::keychain_err)?;
            Ok(Some(password))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(super::keychain_err(error)),
    }
}

#[derive(Deserialize)]
struct Handshake {
    protocol: u32,
    port: u16,
    token: String,
}

async fn start(
    app: &tauri::AppHandle,
    id: &str,
    path: &Path,
    auto_unlock: bool,
) -> Result<PrivateDatabase, CommandError> {
    let credential = if auto_unlock {
        opening_credential(id, !path.exists()).ok().flatten()
    } else {
        None
    };
    let arguments = [
        "workspace-store",
        "--path",
        path.to_str()
            .ok_or_else(|| failure("Invalid workspace path"))?,
    ];
    let shell = app.shell();
    let spawned = shell
        .sidecar("red-ui-reddb")
        .ok()
        .map(|command| command.args(arguments).spawn());
    let (mut events, mut child) = match spawned {
        Some(Ok(pair)) => pair,
        _ if cfg!(debug_assertions) => shell
            .command("red")
            .args(arguments)
            .spawn()
            .map_err(|_| failure("A RedDB binary with local workspace support is required"))?,
        _ => {
            return Err(failure(
                "The bundled RedDB persistence binary is unavailable",
            ))
        }
    };
    let bootstrap = Zeroizing::new(
        json!({ "password": credential.as_deref().map(String::as_str) }).to_string() + "\n",
    );
    if child.write(bootstrap.as_bytes()).is_err() {
        let _ = child.kill();
        return Err(failure("Could not initialize private workspace process"));
    }
    let handshake = tokio::time::timeout(Duration::from_secs(20), async {
        while let Some(event) = events.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    if let Ok(handshake) = serde_json::from_slice::<Handshake>(&bytes) {
                        if handshake.protocol == 1
                            && handshake.port > 0
                            && handshake.token.len() == 64
                        {
                            return Ok(handshake);
                        }
                    }
                }
                CommandEvent::Terminated(_) | CommandEvent::Error(_) => break,
                _ => {} // Never log child output: the handshake contains an IPC-only bearer.
            }
        }
        Err(failure(
            "Private workspace process could not start; saved data was kept",
        ))
    })
    .await;
    let handshake = match handshake {
        Ok(Ok(handshake)) => handshake,
        _ => {
            let _ = child.kill();
            return Err(failure(
                "Private workspace process did not become ready; saved data was kept",
            ));
        }
    };
    tauri::async_runtime::spawn(async move { while events.recv().await.is_some() {} });
    Ok(PrivateDatabase {
        port: handshake.port,
        token: Zeroizing::new(handshake.token),
        child,
        owners: HashSet::new(),
    })
}

impl PrivateDatabase {
    async fn request(&self, method: &str, params: Value) -> Result<Value, CommandError> {
        let body = Zeroizing::new(json!({ "method": method, "params": params }).to_string());
        tokio::time::timeout(Duration::from_secs(10), async {
            let mut stream = tokio::net::TcpStream::connect(("127.0.0.1", self.port)).await.map_err(|_| transport_failure("Private workspace process is unavailable"))?;
            let header = Zeroizing::new(format!("POST /workspace HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nAuthorization: Bearer {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", self.port, self.token.as_str(), body.len()));
            stream.write_all(header.as_bytes()).await.map_err(|_| transport_failure("Could not send workspace operation"))?;
            stream.write_all(body.as_bytes()).await.map_err(|_| transport_failure("Could not send workspace operation"))?;
            let mut response = Zeroizing::new(Vec::new());
            stream.take(4 * 1024 * 1024 + 1).read_to_end(&mut response).await.map_err(|_| transport_failure("Could not read workspace operation"))?;
            if response.len() > 4 * 1024 * 1024 { return Err(transport_failure("Workspace response exceeded its size limit")); }
            let split = response.windows(4).position(|bytes| bytes == b"\r\n\r\n").ok_or_else(|| transport_failure("Invalid workspace response"))?;
            let envelope: Value = serde_json::from_slice(&response[split + 4..]).map_err(|_| transport_failure("Invalid workspace response"))?;
            if envelope.get("ok").and_then(Value::as_bool) != Some(true) {
                return Err(failure(envelope.get("error").and_then(Value::as_str).unwrap_or("Workspace operation failed")));
            }
            Ok(envelope.get("result").cloned().unwrap_or(Value::Null))
        }).await.map_err(|_| transport_failure("Workspace operation timed out; recovery is required before retry"))?
    }

    async fn shutdown(self) {
        let _ =
            tokio::time::timeout(Duration::from_secs(2), self.request("shutdown", json!({}))).await;
        let _ = self.child.kill();
    }
}

/// Serialize per-profile operations behind IPC. Only fixed metadata/Vault
/// operations are admitted; paths, credentials and user SQL are never accepted.
#[tauri::command]
pub async fn workspace_persistence(
    app: tauri::AppHandle,
    profile: String,
    owner: String,
    method: String,
    params: Value,
) -> Result<Value, CommandError> {
    if owner.is_empty() || owner.len() > 128 {
        return Err(failure("Invalid workspace owner"));
    }
    if ![
        "read",
        "commit",
        "vaultStatus",
        "vaultUnlock",
        "vaultLock",
        "vaultKeys",
        "vaultReveal",
        "close",
    ]
    .contains(&method.as_str())
    {
        return Err(failure("Unsupported workspace operation"));
    }
    let id = profile_id(&profile)?;
    let registry = app.state::<WorkspaceRegistry>();
    let mut state = registry.0.lock().await;
    let RegistryState { databases, locked } = &mut *state;
    if method == "close" {
        if let Some(database) = databases.get_mut(&id) {
            database.owners.remove(&owner);
            if database.owners.is_empty() {
                if let Some(database) = databases.remove(&id) {
                    database.shutdown().await;
                }
            }
        }
        return Ok(Value::Null);
    }
    if !databases.contains_key(&id) {
        let path = private_path(&app, &id)?;
        databases.insert(
            id.clone(),
            start(&app, &id, &path, !locked.contains(&id)).await?,
        );
    }
    let database = databases
        .get_mut(&id)
        .ok_or_else(|| failure("Private workspace owner was lost"))?;
    database.owners.insert(owner);
    if method == "vaultLock" || method == "vaultUnlock" {
        locked.insert(id.clone());
    }
    let result =
        if method == "vaultUnlock" {
            async {
                let status = database.request("vaultStatus", json!({})).await?;
                let create = status.get("initialized").and_then(Value::as_bool) == Some(false);
                let credential = opening_credential(&id, create)?.ok_or_else(|| {
            failure("The OS keychain opening credential is missing. Existing saved data was kept.")
        })?;
                database
                    .request(
                        "vaultUnlock",
                        json!({ "password": credential.as_str(), "create": create }),
                    )
                    .await
            }
            .await
        } else {
            database.request(&method, params).await
        };
    if method == "vaultUnlock" && result.is_ok() {
        locked.remove(&id);
    }
    if result
        .as_ref()
        .err()
        .is_some_and(|error| error.code == "WORKSPACE_PROCESS")
    {
        if let Some(database) = databases.remove(&id) {
            database.shutdown().await;
        }
    }
    result
}

pub async fn shutdown_all(app: &tauri::AppHandle) {
    let registry = app.state::<WorkspaceRegistry>();
    let mut databases = registry.0.lock().await;
    for (_, database) in databases.databases.drain() {
        database.shutdown().await;
    }
}

/// Opt-in CI harness; production installers do not enable this feature.
#[cfg(feature = "workspace-persistence-smoke")]
pub fn start_smoke(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        match smoke(&app).await {
            Ok(()) => {
                println!("PASS real Tauri keychain, private process ownership, atomic credentials, lock and restart");
                app.exit(0);
            }
            Err(error) => {
                eprintln!("desktop persistence smoke: {}", error.message);
                app.exit(1);
            }
        }
    });
}

#[cfg(feature = "workspace-persistence-smoke")]
async fn smoke(app: &tauri::AppHandle) -> Result<(), CommandError> {
    let profile = format!("local-vault-smoke-{}", std::process::id());
    let id = profile_id(&profile)?;
    let call = |owner: &str, method: &str, params: Value| {
        workspace_persistence(
            app.clone(),
            profile.clone(),
            owner.to_string(),
            method.to_string(),
            params,
        )
    };
    call("first", "read", json!({})).await?;
    call("first", "vaultUnlock", json!({})).await?;
    call("first", "commit", json!({ "metadata": { "draft": "SELECT 42", "profile": "admin" }, "secrets": { "admin": "desktop smoke private credential" } })).await?;
    call("second", "read", json!({})).await?;
    // Exercise the actual webview IPC boundary as well as the Rust handler.
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| failure("Smoke webview is unavailable"))?;
    let ipc_args = json!({ "profile": profile, "owner": "second", "method": "commit", "params": { "metadata": { "ipc_smoke": "verified" }, "secrets": {} } });
    let script = format!("if (window.__TAURI_INTERNALS__ && !window.__redWorkspaceSmoke) {{ window.__redWorkspaceSmoke = true; window.__TAURI_INTERNALS__.invoke('workspace_persistence', {ipc_args}).catch(() => {{}}); }}");
    let deadline = std::time::Instant::now() + Duration::from_secs(15);
    loop {
        window
            .eval(&script)
            .map_err(|_| failure("Could not reach the smoke webview"))?;
        if call("first", "read", json!({}))
            .await?
            .get("ipc_smoke")
            .and_then(Value::as_str)
            == Some("verified")
        {
            break;
        }
        if std::time::Instant::now() >= deadline {
            return Err(failure("Webview IPC did not commit workspace metadata"));
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    {
        let registry = app.state::<WorkspaceRegistry>();
        let databases = registry.0.lock().await;
        let database = databases
            .databases
            .get(&id)
            .ok_or_else(|| failure("Missing private process"))?;
        if database.owners.len() != 2 {
            return Err(failure("Owners did not share one private process"));
        }
    }
    call("first", "close", json!({})).await?;
    call("second", "vaultLock", json!({})).await?;
    if call("second", "vaultReveal", json!({"name":"admin"}))
        .await
        .is_ok()
    {
        return Err(failure("Locked Vault revealed a credential"));
    }
    if call("second", "commit", json!({ "metadata": { "profile": "must roll back" }, "secrets": { "admin": "abandoned desktop credential" } })).await.is_ok() { return Err(failure("Locked mixed batch was accepted")); }
    let metadata = call("second", "read", json!({})).await?;
    if metadata.get("profile").and_then(Value::as_str) != Some("admin") {
        return Err(failure("Failed credential batch changed metadata"));
    }
    call("second", "close", json!({})).await?;
    let status = call("reopened", "vaultStatus", json!({})).await?;
    if status.get("locked").and_then(Value::as_bool) != Some(true) {
        return Err(failure("Manual lock did not survive process release"));
    }
    call("reopened", "vaultUnlock", json!({})).await?;
    let secret = call("reopened", "vaultReveal", json!({"name":"admin"})).await?;
    if secret.as_str() != Some("desktop smoke private credential") {
        return Err(failure("Reopened private database lost the credential"));
    }
    call("reopened", "close", json!({})).await?;
    let path = private_path(app, &id)?;
    let bytes = std::fs::read(&path).map_err(|_| failure("Could not inspect private database"))?;
    let credential = opening_credential(&id, false)?
        .ok_or_else(|| failure("Opening credential missing from OS keychain"))?;
    for secret in [
        credential.as_str(),
        "desktop smoke private credential",
        "abandoned desktop credential",
    ] {
        if bytes
            .windows(secret.len())
            .any(|window| window == secret.as_bytes())
        {
            return Err(failure("Plaintext credential found in private file"));
        }
    }
    keyring::Entry::new(KEYCHAIN_SERVICE, &id)
        .map_err(super::keychain_err)?
        .delete_credential()
        .map_err(super::keychain_err)?;
    std::fs::remove_file(path).map_err(|_| failure("Could not remove smoke fixture"))?;
    Ok(())
}

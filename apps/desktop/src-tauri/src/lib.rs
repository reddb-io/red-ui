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
        graceful_shutdown(embedded);
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Graceful sidecar shutdown & reaping (#116)
//
// `CommandChild::kill()` is a hard SIGKILL: it terminates the embedded reddb
// server before its store can checkpoint, which risks a model-mismatch class of
// error the next time the same file is opened. Instead we ask the child to
// exit cleanly (SIGTERM), wait a bounded window for it to checkpoint, and only
// force-kill as a backstop. The reap routine is idempotent so it can be wired
// to every exit path (window-destroyed, exit-requested, and OS signals), not
// just the graceful window close Tauri handles on its own.
// ---------------------------------------------------------------------------

/// How long to wait between SIGTERM and the force-kill backstop. Long enough
/// for the store to flush a checkpoint, short enough not to hang app exit.
const GRACEFUL_SHUTDOWN_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(5);
/// How often to poll for a clean exit inside the grace window.
const GRACEFUL_POLL_INTERVAL: std::time::Duration = std::time::Duration::from_millis(100);

/// The next action while draining a child after SIGTERM. Split out as a pure
/// function so the escalation policy is unit-testable without spawning a real
/// process.
#[derive(Debug, PartialEq, Eq)]
enum ShutdownStep {
    /// The process exited on its own; nothing more to do.
    Exited,
    /// Still inside the grace window; keep polling.
    Wait,
    /// The grace window elapsed while the process is still alive; escalate.
    ForceKill,
}

/// Decide what to do next given whether the child is still alive and how long
/// it has been since we sent SIGTERM. Pure — no I/O, no clock, no process.
fn next_shutdown_step(
    alive: bool,
    elapsed: std::time::Duration,
    timeout: std::time::Duration,
) -> ShutdownStep {
    if !alive {
        ShutdownStep::Exited
    } else if elapsed >= timeout {
        ShutdownStep::ForceKill
    } else {
        ShutdownStep::Wait
    }
}

/// Send SIGTERM to `pid`. Returns `false` if the signal could not be delivered
/// (e.g. the process already exited), so the caller can fall back to a hard
/// kill. No-op on non-unix platforms, where `CommandChild::kill()` is the only
/// available mechanism.
#[cfg(unix)]
fn send_sigterm(pid: u32) -> bool {
    // SAFETY: `kill(2)` with a real signal number is always safe to call; a
    // non-zero return just means the target is gone (ESRCH) or we lack
    // permission, both of which we treat as "fall back to force-kill".
    unsafe { libc::kill(pid as libc::pid_t, libc::SIGTERM) == 0 }
}

#[cfg(not(unix))]
fn send_sigterm(_pid: u32) -> bool {
    false
}

/// Whether a process is still alive, via the signal-0 liveness probe.
#[cfg(unix)]
fn process_alive(pid: u32) -> bool {
    // SAFETY: signal 0 performs the permission/existence check without
    // actually delivering a signal — the canonical liveness probe.
    unsafe { libc::kill(pid as libc::pid_t, 0) == 0 }
}

#[cfg(not(unix))]
fn process_alive(_pid: u32) -> bool {
    false
}

/// Gracefully stop one embedded sidecar: SIGTERM, a bounded wait for a clean
/// checkpoint, then a force-kill backstop. Idempotent for a child that has
/// already exited — the liveness probe short-circuits to the force-kill path,
/// which harmlessly reaps the (already dead) handle.
fn graceful_shutdown(embedded: Embedded) {
    let pid = embedded.child.pid();
    // On unix, ask for a clean exit first and wait out the grace window.
    if send_sigterm(pid) {
        let start = std::time::Instant::now();
        loop {
            match next_shutdown_step(process_alive(pid), start.elapsed(), GRACEFUL_SHUTDOWN_TIMEOUT)
            {
                ShutdownStep::Exited => return,
                ShutdownStep::ForceKill => break,
                ShutdownStep::Wait => std::thread::sleep(GRACEFUL_POLL_INTERVAL),
            }
        }
    }
    // Backstop (grace window elapsed, or non-unix where SIGTERM is unavailable).
    let _ = embedded.child.kill();
}

/// Idempotently reap every embedded sidecar. Draining the registry means a
/// second call finds an empty map and does nothing, so this is safe to wire to
/// multiple, possibly-overlapping exit paths. Reaps even through a poisoned
/// lock — during teardown a leaked server is worse than a broken invariant.
fn reap_all(registry: &EmbeddedRegistry) {
    let drained: Vec<Embedded> = match registry.0.lock() {
        Ok(mut map) => map.drain().map(|(_, e)| e).collect(),
        Err(poisoned) => poisoned.into_inner().drain().map(|(_, e)| e).collect(),
    };
    for embedded in drained {
        graceful_shutdown(embedded);
    }
}

/// Install a handler that reaps embedded sidecars on SIGTERM/SIGINT/SIGHUP and
/// then exits — Tauri's `RunEvent` loop never sees these signals, so without
/// this a `kill`/Ctrl-C/terminal-hangup on the shell would leak the children.
#[cfg(unix)]
fn install_signal_reaper(handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        use tokio::signal::unix::{signal, SignalKind};
        let mut term = match signal(SignalKind::terminate()) {
            Ok(s) => s,
            Err(_) => return,
        };
        let mut int = match signal(SignalKind::interrupt()) {
            Ok(s) => s,
            Err(_) => return,
        };
        let mut hup = match signal(SignalKind::hangup()) {
            Ok(s) => s,
            Err(_) => return,
        };
        tokio::select! {
            _ = term.recv() => {},
            _ = int.recv() => {},
            _ = hup.recv() => {},
        }
        if let Some(registry) = handle.try_state::<EmbeddedRegistry>() {
            reap_all(&registry);
        }
        handle.exit(0);
    });
}

#[cfg(not(unix))]
fn install_signal_reaper(_handle: tauri::AppHandle) {}

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
            // Reap embedded sidecars on OS signals to the shell process itself,
            // which Tauri's RunEvent loop never observes (#116).
            install_signal_reaper(app.handle().clone());
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
            // Reap embedded reddb sidecars on every teardown path so we never
            // leak a file-backed server holding the database open: the last
            // window being destroyed, an exit being requested, and the final
            // exit. `reap_all` is idempotent, so overlapping events are safe.
            let should_reap = matches!(
                event,
                tauri::RunEvent::WindowEvent {
                    event: tauri::WindowEvent::Destroyed,
                    ..
                } | tauri::RunEvent::ExitRequested { .. }
                    | tauri::RunEvent::Exit
            );
            if should_reap {
                if let Some(registry) = app_handle.try_state::<EmbeddedRegistry>() {
                    reap_all(&registry);
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

    use std::time::Duration;

    #[test]
    fn shutdown_step_exits_when_process_gone() {
        // A dead child ends the loop regardless of elapsed time — a clean exit
        // inside the grace window must never escalate to force-kill.
        assert_eq!(
            next_shutdown_step(false, Duration::ZERO, GRACEFUL_SHUTDOWN_TIMEOUT),
            ShutdownStep::Exited
        );
        assert_eq!(
            next_shutdown_step(false, Duration::from_secs(60), GRACEFUL_SHUTDOWN_TIMEOUT),
            ShutdownStep::Exited
        );
    }

    #[test]
    fn shutdown_step_waits_inside_grace_window() {
        assert_eq!(
            next_shutdown_step(true, Duration::ZERO, GRACEFUL_SHUTDOWN_TIMEOUT),
            ShutdownStep::Wait
        );
        assert_eq!(
            next_shutdown_step(
                true,
                GRACEFUL_SHUTDOWN_TIMEOUT - Duration::from_millis(1),
                GRACEFUL_SHUTDOWN_TIMEOUT
            ),
            ShutdownStep::Wait
        );
    }

    #[test]
    fn shutdown_step_force_kills_after_timeout() {
        // At exactly the timeout, and beyond, a still-alive child escalates.
        assert_eq!(
            next_shutdown_step(true, GRACEFUL_SHUTDOWN_TIMEOUT, GRACEFUL_SHUTDOWN_TIMEOUT),
            ShutdownStep::ForceKill
        );
        assert_eq!(
            next_shutdown_step(
                true,
                GRACEFUL_SHUTDOWN_TIMEOUT + Duration::from_secs(1),
                GRACEFUL_SHUTDOWN_TIMEOUT
            ),
            ShutdownStep::ForceKill
        );
    }

    #[test]
    fn reap_all_on_empty_registry_is_a_noop() {
        // The idempotency backbone: reaping an already-drained registry does
        // nothing and never panics, so wiring it to overlapping exit paths is
        // safe.
        let registry = EmbeddedRegistry::default();
        reap_all(&registry);
        assert!(registry.0.lock().expect("lock").is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn process_alive_tracks_a_real_child() {
        // Our own process is alive; a child we spawn and fully reap is not.
        // The probe must distinguish the two for the grace-window loop to
        // terminate instead of spinning to the force-kill backstop every time.
        assert!(process_alive(std::process::id()));

        let mut child = std::process::Command::new("true")
            .spawn()
            .expect("spawn `true`");
        let pid = child.id();
        child.wait().expect("reap child");
        assert!(!process_alive(pid));
    }
}

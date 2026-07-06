use std::{
    env, fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    sync::Mutex,
    thread,
    time::Duration,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::process::CommandChild;

#[cfg(debug_assertions)]
mod dev;
#[cfg(not(debug_assertions))]
mod sidecar;

#[cfg(debug_assertions)]
use dev as backend;
#[cfg(not(debug_assertions))]
use sidecar as backend;

const ENSURE_TIMEOUT: Duration = Duration::from_secs(8);
const POLL_INTERVAL: Duration = Duration::from_millis(100);

pub type Result<T> = std::result::Result<T, String>;

#[derive(Default)]
pub struct RuntimeService {
    inner: Mutex<RuntimeProcess>,
}

#[derive(Default)]
pub(super) struct RuntimeProcess {
    child: Option<CommandChild>,
    state: Option<RuntimeState>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RuntimeState {
    host: String,
    pid: u32,
    port: u16,
    #[serde(rename = "startedAt")]
    started_at: String,
}

impl RuntimeState {
    fn dashboard_url(&self) -> String {
        format!("http://{}:{}", self.host, self.port)
    }
}

pub fn ensure_started(app: &AppHandle) -> Result<RuntimeState> {
    let service = app.state::<RuntimeService>();
    let mut process = service
        .inner
        .lock()
        .map_err(|_| "runtime service lock is poisoned".to_string())?;

    if let Some(state) = process.state.as_ref().filter(|state| is_healthy(state)) {
        return Ok(state.clone());
    }

    backend::start(app, &mut process)
}

pub fn open_dashboard(app: &AppHandle) -> Result<()> {
    let state = ensure_started(app)?;

    app.opener()
        .open_url(state.dashboard_url(), None::<&str>)
        .map_err(|error| format!("failed to open dashboard: {error}"))
}

pub fn restart(app: &AppHandle) -> Result<()> {
    stop(app)?;
    thread::sleep(Duration::from_millis(300));
    ensure_started(app).map(|_| ())
}

pub fn stop(app: &AppHandle) -> Result<()> {
    let service = app.state::<RuntimeService>();
    let mut process = service
        .inner
        .lock()
        .map_err(|_| "runtime service lock is poisoned".to_string())?;

    backend::stop(&mut process)
}

pub fn stop_owned(app: &AppHandle) {
    let service = app.state::<RuntimeService>();
    let Ok(mut process) = service.inner.lock() else {
        return;
    };

    if let Some(child) = process.child.take() {
        let _ = child.kill();
        remove_state_file();
    }

    process.state = None;
}

pub(super) fn is_healthy(state: &RuntimeState) -> bool {
    let Ok(addresses) = (state.host.as_str(), state.port).to_socket_addrs() else {
        return false;
    };

    addresses
        .into_iter()
        .any(|address| is_address_healthy(state, address))
}

fn is_address_healthy(state: &RuntimeState, address: SocketAddr) -> bool {
    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(500)) else {
        return false;
    };

    let _ = stream.set_read_timeout(Some(Duration::from_millis(800)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(800)));

    let request = format!(
        "GET /api/health HTTP/1.1\r\nHost: {}:{}\r\nConnection: close\r\n\r\n",
        state.host, state.port
    );

    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }

    let mut response = [0_u8; 64];
    let Ok(length) = stream.read(&mut response) else {
        return false;
    };
    let status_line = String::from_utf8_lossy(&response[..length]);

    status_line.starts_with("HTTP/1.1 200") || status_line.starts_with("HTTP/1.0 200")
}

#[cfg(not(debug_assertions))]
pub(super) fn read_state() -> Option<RuntimeState> {
    read_state_from(&runtime_state_path(&codex_home()))
}

#[cfg(not(debug_assertions))]
pub(super) fn read_state_from(path: &Path) -> Option<RuntimeState> {
    let contents = fs::read_to_string(path).ok()?;

    serde_json::from_str(&contents).ok()
}

pub(super) fn remove_state_file() {
    let _ = fs::remove_file(runtime_state_path(&codex_home()));
}

pub(super) fn runtime_state_path(codex_home: &Path) -> PathBuf {
    codex_home.join(".codexkit").join("runtime.json")
}

pub(super) fn codex_home() -> PathBuf {
    if let Some(path) = env::var_os("CODEX_HOME") {
        return PathBuf::from(path);
    }

    home_dir().join(".codex")
}

fn home_dir() -> PathBuf {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

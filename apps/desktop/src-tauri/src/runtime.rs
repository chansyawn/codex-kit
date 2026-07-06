mod launch;

use std::{
    env, fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::Command as StdCommand,
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

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

    ensure_started_locked(app, &mut process)
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

    stop_runtime(&mut process)
}

pub fn stop_owned(app: &AppHandle) {
    let service = app.state::<RuntimeService>();
    let Ok(mut process) = service.inner.lock() else {
        return;
    };

    let _ = stop_runtime(&mut process);
}

fn ensure_started_locked(app: &AppHandle, process: &mut RuntimeProcess) -> Result<RuntimeState> {
    if let Some(state) = process.state.as_ref().filter(|state| is_healthy(state)) {
        return Ok(state.clone());
    }

    if let Some(state) = read_state().filter(is_healthy) {
        process.state = Some(state.clone());
        return Ok(state);
    }

    remove_state_file();
    start_runtime(app, process)
}

fn start_runtime(app: &AppHandle, process: &mut RuntimeProcess) -> Result<RuntimeState> {
    let codex_home = codex_home();
    let state_path = runtime_state_path(&codex_home);
    let launch = launch::create(app, &codex_home, &state_path)?;
    let label = launch.label;
    let (mut rx, child) = launch
        .command
        .spawn()
        .map_err(|error| format!("failed to start CodexKit {label}: {error}"))?;
    let pid = child.pid();

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => log_runtime_output(label, "stdout", &bytes),
                CommandEvent::Stderr(bytes) => log_runtime_output(label, "stderr", &bytes),
                CommandEvent::Error(error) => eprintln!("CodexKit {label} error: {error}"),
                CommandEvent::Terminated(payload) => {
                    eprintln!(
                        "CodexKit {label} terminated: code={:?} signal={:?}",
                        payload.code, payload.signal
                    );
                }
                _ => {}
            }
        }
    });

    process.child = Some(child);

    if let Some(state) = launch.expected_state.map(|state| state.into_state(pid)) {
        if let Err(error) = write_state(&state_path, &state) {
            if let Some(child) = process.child.take() {
                let _ = child.kill();
            }

            remove_state_file();
            return Err(error);
        }
    }

    match wait_for_state(&state_path) {
        Ok(state) => {
            if state.pid != pid {
                eprintln!(
                    "CodexKit {label} reported pid {}, expected {}",
                    state.pid, pid
                );
            }

            process.state = Some(state.clone());
            Ok(state)
        }
        Err(error) => {
            if let Some(child) = process.child.take() {
                let _ = child.kill();
            }

            process.state = None;
            remove_state_file();
            Err(error)
        }
    }
}

fn stop_runtime(process: &mut RuntimeProcess) -> Result<()> {
    let mut stop_error = None;

    if let Some(child) = process.child.take() {
        if let Err(error) = child.kill() {
            stop_error = Some(format!("failed to stop CodexKit runtime: {error}"));
        }
    } else if let Some(state) = process
        .state
        .clone()
        .or_else(read_state)
        .filter(|state| state.pid > 0)
    {
        terminate_pid(state.pid);
    }

    process.state = None;
    remove_state_file();

    match stop_error {
        Some(error) => Err(error),
        None => Ok(()),
    }
}

fn wait_for_state(state_path: &Path) -> Result<RuntimeState> {
    let start = Instant::now();

    while start.elapsed() < ENSURE_TIMEOUT {
        if let Some(state) = read_state_from(state_path).filter(is_healthy) {
            return Ok(state);
        }

        thread::sleep(POLL_INTERVAL);
    }

    Err("timed out waiting for CodexKit runtime to start".to_string())
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

pub(super) fn read_state() -> Option<RuntimeState> {
    read_state_from(&runtime_state_path(&codex_home()))
}

pub(super) fn read_state_from(path: &Path) -> Option<RuntimeState> {
    let contents = fs::read_to_string(path).ok()?;

    serde_json::from_str(&contents).ok()
}

pub(super) fn write_state(path: &Path, state: &RuntimeState) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create runtime state directory: {error}"))?;
    }

    let contents = serde_json::to_string_pretty(state)
        .map_err(|error| format!("failed to serialize runtime state: {error}"))?;
    fs::write(path, format!("{contents}\n"))
        .map_err(|error| format!("failed to write runtime state: {error}"))
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

fn terminate_pid(pid: u32) {
    let pid_arg = pid.to_string();

    #[cfg(windows)]
    let status = StdCommand::new("taskkill")
        .args(["/PID", &pid_arg, "/T", "/F"])
        .status();

    #[cfg(not(windows))]
    let status = StdCommand::new("kill").args(["-TERM", &pid_arg]).status();

    if let Err(error) = status {
        eprintln!("Unable to terminate CodexKit runtime pid {pid}: {error}");
    }
}

fn log_runtime_output(label: &str, stream: &str, bytes: &[u8]) {
    let message = String::from_utf8_lossy(bytes).trim().to_string();

    if !message.is_empty() {
        eprintln!("CodexKit {label} {stream}: {message}");
    }
}

use std::{ffi::OsString, path::Path, process::Command as StdCommand, thread, time::Instant};

use tauri::AppHandle;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

use super::{
    codex_home, is_healthy, read_state, read_state_from, remove_state_file, runtime_state_path,
    Result, RuntimeProcess, RuntimeState, ENSURE_TIMEOUT, POLL_INTERVAL,
};

pub(super) fn start(app: &AppHandle, process: &mut RuntimeProcess) -> Result<RuntimeState> {
    if let Some(state) = read_state().filter(is_healthy) {
        process.state = Some(state.clone());
        return Ok(state);
    }

    remove_state_file();
    start_sidecar(app, process)
}

pub(super) fn stop(process: &mut RuntimeProcess) -> Result<()> {
    if let Some(child) = process.child.take() {
        child
            .kill()
            .map_err(|error| format!("failed to stop runtime sidecar: {error}"))?;
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
    Ok(())
}

fn start_sidecar(app: &AppHandle, process: &mut RuntimeProcess) -> Result<RuntimeState> {
    let codex_home = codex_home();
    let state_path = runtime_state_path(&codex_home);
    let args = sidecar_args(&codex_home, &state_path);
    let (mut rx, child) = app
        .shell()
        .sidecar("codexkit-runtime")
        .map_err(|error| format!("failed to resolve CodexKit runtime sidecar: {error}"))?
        .args(args)
        .env("CODEX_HOME", &codex_home)
        .spawn()
        .map_err(|error| format!("failed to start CodexKit runtime sidecar: {error}"))?;
    let pid = child.pid();

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => log_sidecar_output("stdout", &bytes),
                CommandEvent::Stderr(bytes) => log_sidecar_output("stderr", &bytes),
                CommandEvent::Error(error) => eprintln!("CodexKit runtime sidecar error: {error}"),
                CommandEvent::Terminated(payload) => {
                    eprintln!(
                        "CodexKit runtime sidecar terminated: code={:?} signal={:?}",
                        payload.code, payload.signal
                    );
                }
                _ => {}
            }
        }
    });

    process.child = Some(child);
    let state = wait_for_state(&state_path)?;

    if state.pid != pid {
        eprintln!(
            "CodexKit runtime sidecar reported pid {}, expected {}",
            state.pid, pid
        );
    }

    process.state = Some(state.clone());
    Ok(state)
}

fn sidecar_args(codex_home: &Path, state_path: &Path) -> Vec<OsString> {
    vec![
        "--codex-home".into(),
        codex_home.as_os_str().to_os_string(),
        "--state-file".into(),
        state_path.as_os_str().to_os_string(),
        "--version".into(),
        env!("CARGO_PKG_VERSION").into(),
    ]
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

fn log_sidecar_output(stream: &str, bytes: &[u8]) {
    let message = String::from_utf8_lossy(bytes).trim().to_string();

    if !message.is_empty() {
        eprintln!("CodexKit runtime {stream}: {message}");
    }
}

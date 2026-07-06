use std::{
    thread,
    time::{Instant, SystemTime, UNIX_EPOCH},
};

use tauri::AppHandle;

use super::{
    is_healthy, remove_state_file, Result, RuntimeProcess, RuntimeState, ENSURE_TIMEOUT,
    POLL_INTERVAL,
};

const DEV_RUNTIME_HOST: &str = "localhost";
const DEV_RUNTIME_PORT: u16 = 31542;

pub(super) fn start(_app: &AppHandle, process: &mut RuntimeProcess) -> Result<RuntimeState> {
    remove_state_file();

    let state = RuntimeState {
        host: DEV_RUNTIME_HOST.to_string(),
        pid: 0,
        port: DEV_RUNTIME_PORT,
        started_at: current_timestamp(),
    };
    let state = wait_for_dev_runtime(state)?;

    process.child = None;
    process.state = Some(state.clone());
    Ok(state)
}

pub(super) fn stop(process: &mut RuntimeProcess) -> Result<()> {
    process.child = None;
    process.state = None;
    remove_state_file();
    Ok(())
}

fn wait_for_dev_runtime(state: RuntimeState) -> Result<RuntimeState> {
    let start = Instant::now();

    while start.elapsed() < ENSURE_TIMEOUT {
        if is_healthy(&state) {
            return Ok(state);
        }

        thread::sleep(POLL_INTERVAL);
    }

    Err(format!(
        "CodexKit dev runtime is not ready at http://{}:{}. Start it with `vp dev ../runtime`.",
        state.host, state.port
    ))
}

fn current_timestamp() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();

    millis.to_string()
}

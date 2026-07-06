#[cfg(not(debug_assertions))]
use std::ffi::OsString;
use std::path::Path;
#[cfg(debug_assertions)]
use std::{
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::AppHandle;
use tauri_plugin_shell::{process::Command, ShellExt};

use super::{Result, RuntimeState};

#[cfg(debug_assertions)]
const DEV_RUNTIME_HOST: &str = "127.0.0.1";
#[cfg(debug_assertions)]
const DEV_RUNTIME_PORT: u16 = 31542;

pub(super) struct RuntimeLaunch {
    pub(super) label: &'static str,
    pub(super) command: Command,
    pub(super) expected_state: Option<ExpectedRuntimeState>,
}

pub(super) struct ExpectedRuntimeState {
    host: String,
    port: u16,
    started_at: String,
}

impl ExpectedRuntimeState {
    pub(super) fn into_state(self, pid: u32) -> RuntimeState {
        RuntimeState {
            host: self.host,
            pid,
            port: self.port,
            started_at: self.started_at,
        }
    }
}

pub(super) fn create(
    app: &AppHandle,
    codex_home: &Path,
    state_path: &Path,
) -> Result<RuntimeLaunch> {
    create_platform_launch(app, codex_home, state_path)
}

#[cfg(debug_assertions)]
fn create_platform_launch(
    app: &AppHandle,
    codex_home: &Path,
    _state_path: &Path,
) -> Result<RuntimeLaunch> {
    let started_at = current_timestamp();
    let command = app
        .shell()
        .command(vp_program())
        .args(["dev"])
        .current_dir(runtime_root())
        .env("CODEX_HOME", codex_home)
        .env("CODEXKIT_CODEX_HOME", codex_home)
        .env("CODEXKIT_STARTED_AT", &started_at)
        .env("CODEXKIT_VERSION", env!("CARGO_PKG_VERSION"));

    Ok(RuntimeLaunch {
        label: "dev runtime",
        command,
        expected_state: Some(ExpectedRuntimeState {
            host: DEV_RUNTIME_HOST.to_string(),
            port: DEV_RUNTIME_PORT,
            started_at,
        }),
    })
}

#[cfg(not(debug_assertions))]
fn create_platform_launch(
    app: &AppHandle,
    codex_home: &Path,
    state_path: &Path,
) -> Result<RuntimeLaunch> {
    let command = app
        .shell()
        .sidecar("codexkit-runtime")
        .map_err(|error| format!("failed to resolve CodexKit runtime sidecar: {error}"))?
        .args(sidecar_args(codex_home, state_path))
        .env("CODEX_HOME", codex_home);

    Ok(RuntimeLaunch {
        label: "runtime sidecar",
        command,
        expected_state: None,
    })
}

#[cfg(debug_assertions)]
fn runtime_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("runtime")
}

#[cfg(debug_assertions)]
fn vp_program() -> &'static str {
    if cfg!(windows) {
        "vp.cmd"
    } else {
        "vp"
    }
}

#[cfg(not(debug_assertions))]
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

#[cfg(debug_assertions)]
fn current_timestamp() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();

    millis.to_string()
}

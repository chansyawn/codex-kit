mod runtime;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(runtime::RuntimeService::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Err(error) = runtime::open_dashboard(app) {
                eprintln!("Unable to open CodexKit dashboard from second instance: {error}");
            }
        }))
        .setup(|app| {
            tray::create_tray(app)?;

            if let Err(error) = runtime::ensure_started(app.handle()) {
                eprintln!("Unable to start CodexKit runtime: {error}");
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building CodexKit desktop application");

    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            runtime::stop_owned(app_handle);
        }
    });
}

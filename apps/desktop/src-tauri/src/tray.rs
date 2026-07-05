use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App,
};

use crate::runtime;

const OPEN_DASHBOARD_ID: &str = "open-dashboard";
const RESTART_SERVICE_ID: &str = "restart-service";
const STOP_SERVICE_ID: &str = "stop-service";
const QUIT_ID: &str = "quit";

pub fn create_tray(app: &App) -> tauri::Result<()> {
    let open_dashboard = MenuItem::with_id(
        app,
        OPEN_DASHBOARD_ID,
        "Open Dashboard",
        true,
        None::<&str>,
    )?;
    let restart_service = MenuItem::with_id(
        app,
        RESTART_SERVICE_ID,
        "Restart Service",
        true,
        None::<&str>,
    )?;
    let stop_service =
        MenuItem::with_id(app, STOP_SERVICE_ID, "Stop Service", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_ID, "Quit CodexKit", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(
        app,
        &[
            &open_dashboard,
            &restart_service,
            &stop_service,
            &separator,
            &quit,
        ],
    )?;
    let icon = app
        .default_window_icon()
        .expect("CodexKit desktop requires a bundled application icon");

    TrayIconBuilder::new()
        .icon(icon.clone())
        .tooltip("CodexKit")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            OPEN_DASHBOARD_ID => report("open dashboard", runtime::open_dashboard(app)),
            RESTART_SERVICE_ID => report("restart service", runtime::restart(app)),
            STOP_SERVICE_ID => report("stop service", runtime::stop(app)),
            QUIT_ID => {
                runtime::stop_owned(app);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                report(
                    "open dashboard",
                    runtime::open_dashboard(tray.app_handle()),
                );
            }
        })
        .build(app)?;

    Ok(())
}

fn report(action: &str, result: runtime::Result<()>) {
    if let Err(error) = result {
        eprintln!("Unable to {action}: {error}");
    }
}

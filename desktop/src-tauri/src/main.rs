// StickForStats Desktop Application
// Wraps the React frontend using Tauri for native desktop experience.

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::Manager;

/// Get application version
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get platform information for the About dialog
#[tauri::command]
fn get_platform_info() -> serde_json::Value {
    serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": env!("CARGO_PKG_VERSION"),
        "name": "StickForStats Desktop",
        "tauri_version": tauri::VERSION,
    })
}

/// Open a file dialog and return the selected file path
#[tauri::command]
async fn open_data_file(window: tauri::Window) -> Result<Option<String>, String> {
    use tauri::api::dialog::FileDialogBuilder;

    let (tx, rx) = std::sync::mpsc::channel();

    FileDialogBuilder::new()
        .add_filter("Data Files", &["csv", "xlsx", "xls", "json", "sav", "sas7bdat", "dta"])
        .add_filter("CSV Files", &["csv", "tsv"])
        .add_filter("Excel Files", &["xlsx", "xls"])
        .add_filter("SPSS Files", &["sav"])
        .add_filter("All Files", &["*"])
        .set_parent(&window)
        .pick_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string_lossy().to_string()));
        });

    rx.recv().map_err(|e| e.to_string())
}

/// Export results to a file
#[tauri::command]
async fn save_export_file(window: tauri::Window, default_name: String) -> Result<Option<String>, String> {
    use tauri::api::dialog::FileDialogBuilder;

    let (tx, rx) = std::sync::mpsc::channel();

    FileDialogBuilder::new()
        .add_filter("PDF Report", &["pdf"])
        .add_filter("CSV Data", &["csv"])
        .add_filter("JSON", &["json"])
        .add_filter("HTML Report", &["html"])
        .set_file_name(&default_name)
        .set_parent(&window)
        .save_file(move |path| {
            let _ = tx.send(path.map(|p| p.to_string_lossy().to_string()));
        });

    rx.recv().map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Set up window title
            let main_window = app.get_window("main").unwrap();
            main_window.set_title("StickForStats — Statistical Analysis Platform").unwrap();

            #[cfg(debug_assertions)]
            {
                // Open devtools in debug mode
                main_window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_platform_info,
            open_data_file,
            save_export_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running StickForStats desktop application");
}

mod executor;
mod packages;
mod settings;
mod snippets;

use executor::execute_code;
use packages::{install_package, list_packages, remove_package};
use settings::{get_settings, save_settings};
use snippets::{delete_snippet, get_snippets, save_snippet};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            execute_code,
            install_package,
            remove_package,
            list_packages,
            get_snippets,
            save_snippet,
            delete_snippet,
            get_settings,
            save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

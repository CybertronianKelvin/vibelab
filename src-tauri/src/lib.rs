mod ai;
mod executor;
mod formatter;
mod packages;
mod project;
mod settings;
mod snippets;

use ai::ai_complete;
use executor::execute_code;
use formatter::format_php;
use packages::{install_package, list_packages, remove_package};
use project::get_project_classes;
use settings::{get_settings, save_settings};
use snippets::{clear_history, delete_snippet, get_history, get_snippets, save_history_entry, save_snippet};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            ai_complete,
            execute_code,
            format_php,
            install_package,
            remove_package,
            list_packages,
            get_snippets,
            save_snippet,
            delete_snippet,
            get_history,
            save_history_entry,
            clear_history,
            get_settings,
            save_settings,
            get_project_classes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

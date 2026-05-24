#[tauri::command]
pub fn get_project_classes(project_path: String) -> Vec<String> {
    let base = std::path::Path::new(&project_path);
    let scan_dirs = [
        ("app/Models", "App\\Models"),
        ("app/Http/Controllers", "App\\Http\\Controllers"),
        ("app/Http/Requests", "App\\Http\\Requests"),
        ("app/Http/Middleware", "App\\Http\\Middleware"),
        ("app/Providers", "App\\Providers"),
        ("app/Jobs", "App\\Jobs"),
        ("app/Events", "App\\Events"),
        ("app/Listeners", "App\\Listeners"),
        ("app/Mail", "App\\Mail"),
        ("app/Notifications", "App\\Notifications"),
        ("app/Policies", "App\\Policies"),
        ("app/Rules", "App\\Rules"),
        ("app/Console/Commands", "App\\Console\\Commands"),
    ];

    let mut classes = Vec::new();
    for (dir, ns) in &scan_dirs {
        let path = base.join(dir);
        if let Ok(entries) = std::fs::read_dir(&path) {
            for entry in entries.flatten() {
                let fname = entry.file_name();
                let s = fname.to_string_lossy();
                if s.ends_with(".php") && !s.starts_with('.') {
                    let class = s.trim_end_matches(".php").to_string();
                    classes.push(format!("{}\\{}", ns, class));
                }
            }
        }
    }
    classes.sort();
    classes
}

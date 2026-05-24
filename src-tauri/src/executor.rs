use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Clone, Serialize, Deserialize)]
pub struct ExecutionLine {
    pub output_type: String,
    pub content: String,
    pub timestamp: i64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ExecutionDone {
    pub exit_code: Option<i32>,
}

fn find_binary(cmd_name: &str, fixed_paths: &[&str]) -> Result<String, String> {
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg(format!("which {0} 2>/dev/null || command -v {0} 2>/dev/null", cmd_name))
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() && std::path::Path::new(&path).exists() {
            return Ok(path);
        }
    }

    for path in fixed_paths {
        if std::path::Path::new(path).exists() {
            return Ok(path.to_string());
        }
    }

    Err(format!("{} not found. Install it or set the path in Settings.", cmd_name))
}

fn find_node_path() -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| String::from("/"));
    let nvm_dirs = [
        format!("{}/.nvm/versions/node", home),
        format!("{}/Library/Application Support/Herd/config/nvm/versions/node", home),
    ];

    let fixed = [
        "/usr/local/bin/node",
        "/opt/homebrew/bin/node",
        "/usr/bin/node",
    ];

    if let Ok(path) = find_binary("node", &fixed) {
        return Ok(path);
    }

    for dir in &nvm_dirs {
        let p = std::path::Path::new(dir);
        if p.is_dir() {
            if let Ok(entries) = std::fs::read_dir(p) {
                let mut versions: Vec<PathBuf> =
                    entries.filter_map(|e| e.ok().map(|e| e.path())).collect();
                versions.sort();
                if let Some(latest) = versions.last() {
                    let bin = latest.join("bin").join("node");
                    if bin.exists() {
                        return Ok(bin.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    Err("Node.js not found. Set the path in Settings or install from https://nodejs.org".to_string())
}

fn find_php_path() -> Result<String, String> {
    find_binary("php", &["/usr/bin/php", "/usr/local/bin/php", "/opt/homebrew/bin/php"])
        .map_err(|_| "PHP not found. Install PHP or set the path in Settings.".to_string())
}

fn workspace_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let ws = PathBuf::from(home).join(".lexjs").join("workspace");
    std::fs::create_dir_all(&ws).map_err(|e| e.to_string())?;
    let pkg = ws.join("package.json");
    if !pkg.exists() {
        std::fs::write(
            &pkg,
            r#"{"name":"lexjs-workspace","version":"1.0.0","private":true,"dependencies":{}}"#,
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(ws)
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

async fn stream_process(
    app: AppHandle,
    cmd: String,
    args: Vec<String>,
    env_vars: Vec<(String, String)>,
    cwd: PathBuf,
) -> Result<(), String> {
    let mut command = Command::new(&cmd);
    command.args(&args).current_dir(&cwd)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    for (k, v) in env_vars {
        command.env(k, v);
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to start {}: {}", cmd, e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let app_out = app.clone();
    let out_task = tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_out.emit("execution-output", ExecutionLine {
                output_type: "stdout".into(),
                content: line,
                timestamp: now_ms(),
            });
        }
    });

    let app_err = app.clone();
    let err_task = tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_err.emit("execution-output", ExecutionLine {
                output_type: "stderr".into(),
                content: line,
                timestamp: now_ms(),
            });
        }
    });

    let status = child.wait().await.map_err(|e| e.to_string())?;
    let _ = tokio::join!(out_task, err_task);

    app.emit("execution-done", ExecutionDone { exit_code: status.code() })
        .map_err(|e| e.to_string())?;

    Ok(())
}

async fn execute_node_code(
    app: AppHandle,
    code: String,
    language: String,
    node_path: Option<String>,
    project_path: Option<String>,
) -> Result<(), String> {
    let node_bin = match node_path.as_deref() {
        Some(p) if !p.is_empty() && std::path::Path::new(p).exists() => p.to_string(),
        _ => find_node_path()?,
    };

    let workspace = workspace_dir()?;
    let suffix = if language == "ts" { ".ts" } else { ".mjs" };
    let temp = tempfile::Builder::new()
        .suffix(suffix)
        .tempfile()
        .map_err(|e| e.to_string())?;

    let preamble = "import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);\n";
    std::fs::write(temp.path(), format!("{}{}", preamble, code))
        .map_err(|e| e.to_string())?;

    let temp_path = temp.path().to_path_buf();

    let tsx_bin = workspace.join("node_modules").join(".bin").join("tsx");
    let (cmd, args): (String, Vec<String>) = if language == "ts" && tsx_bin.exists() {
        (tsx_bin.to_string_lossy().to_string(), vec![temp_path.to_string_lossy().to_string()])
    } else {
        (node_bin, vec![temp_path.to_string_lossy().to_string()])
    };

    let cwd = project_path.as_deref()
        .map(std::path::Path::new)
        .filter(|p| p.is_dir())
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| workspace.clone());

    let mut node_path_entries = vec![workspace.join("node_modules").to_string_lossy().to_string()];
    if let Some(ref proj) = project_path {
        let proj_modules = std::path::Path::new(proj).join("node_modules");
        if proj_modules.is_dir() {
            node_path_entries.insert(0, proj_modules.to_string_lossy().to_string());
        }
    }

    stream_process(app, cmd, args, vec![("NODE_PATH".into(), node_path_entries.join(":"))], cwd).await
}

async fn execute_php_code(
    app: AppHandle,
    code: String,
    php_path: Option<String>,
    project_path: Option<String>,
) -> Result<(), String> {
    let php_bin = match php_path.as_deref() {
        Some(p) if !p.is_empty() && std::path::Path::new(p).exists() => p.to_string(),
        _ => find_php_path()?,
    };

    let full_code = build_php_code(&code, project_path.as_deref());

    let temp = tempfile::Builder::new()
        .suffix(".php")
        .tempfile()
        .map_err(|e| e.to_string())?;
    std::fs::write(temp.path(), full_code).map_err(|e| e.to_string())?;

    let cwd = project_path.as_deref()
        .map(std::path::Path::new)
        .filter(|p| p.is_dir())
        .map(|p| p.to_path_buf())
        .unwrap_or_else(std::env::temp_dir);

    stream_process(app, php_bin, vec![temp.path().to_string_lossy().to_string()], vec![], cwd).await
}

fn build_php_code(code: &str, project_path: Option<&str>) -> String {
    let Some(proj) = project_path else {
        return format!("<?php\n{}", code);
    };

    let proj_path = std::path::Path::new(proj);
    let autoload = proj_path.join("vendor").join("autoload.php");

    if !autoload.exists() {
        return format!("<?php\n{}", code);
    }

    let autoload_str = autoload.to_string_lossy();
    let is_laravel = proj_path.join("artisan").exists();

    if is_laravel {
        let bootstrap = proj_path.join("bootstrap").join("app.php");
        format!(
            "<?php\ndefine('LARAVEL_START', microtime(true));\nrequire '{}';\n$app = require_once '{}';\n$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);\n$kernel->bootstrap();\n\n{}",
            autoload_str,
            bootstrap.to_string_lossy(),
            code
        )
    } else {
        format!("<?php\nrequire '{}';\n\n{}", autoload_str, code)
    }
}

#[tauri::command]
pub async fn execute_code(
    app: AppHandle,
    code: String,
    language: String,
    node_path: Option<String>,
    php_path: Option<String>,
    project_path: Option<String>,
) -> Result<(), String> {
    if language == "php" {
        execute_php_code(app, code, php_path, project_path).await
    } else {
        execute_node_code(app, code, language, node_path, project_path).await
    }
}

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

fn find_node_path() -> Result<String, String> {
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg("which node 2>/dev/null || command -v node 2>/dev/null")
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout)
            .trim()
            .to_string();
        if !path.is_empty() && std::path::Path::new(&path).exists() {
            return Ok(path);
        }
    }

    let home = std::env::var("HOME").unwrap_or_else(|_| String::from("/"));
    let nvm_dirs = vec![
        format!("{}/.nvm/versions/node", home),
        format!(
            "{}/Library/Application Support/Herd/config/nvm/versions/node",
            home
        ),
    ];

    let fixed = [
        "/usr/local/bin/node".to_string(),
        "/opt/homebrew/bin/node".to_string(),
        "/usr/bin/node".to_string(),
    ];

    for path in &fixed {
        if std::path::Path::new(path).exists() {
            return Ok(path.clone());
        }
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

    Err(
        "Node.js not found. Set the path in Settings or install from https://nodejs.org"
            .to_string(),
    )
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

#[tauri::command]
pub async fn execute_code(
    app: AppHandle,
    code: String,
    language: String,
    node_path: Option<String>,
) -> Result<(), String> {
    let node_path = match node_path.as_deref() {
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
        (
            tsx_bin.to_string_lossy().to_string(),
            vec![temp_path.to_string_lossy().to_string()],
        )
    } else {
        (
            node_path,
            vec![temp_path.to_string_lossy().to_string()],
        )
    };

    let mut child = Command::new(&cmd)
        .args(&args)
        .env("NODE_PATH", workspace.join("node_modules"))
        .current_dir(&workspace)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Node.js: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let app_out = app.clone();
    let out_task = tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_out.emit(
                "execution-output",
                ExecutionLine {
                    output_type: "stdout".into(),
                    content: line,
                    timestamp: now_ms(),
                },
            );
        }
    });

    let app_err = app.clone();
    let err_task = tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_err.emit(
                "execution-output",
                ExecutionLine {
                    output_type: "stderr".into(),
                    content: line,
                    timestamp: now_ms(),
                },
            );
        }
    });

    let status = child.wait().await.map_err(|e| e.to_string())?;
    let _ = tokio::join!(out_task, err_task);

    app.emit("execution-done", ExecutionDone { exit_code: status.code() })
        .map_err(|e| e.to_string())?;

    Ok(())
}

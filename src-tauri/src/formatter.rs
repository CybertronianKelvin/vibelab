use std::io::Write;

fn find_php_cs_fixer() -> Option<String> {
    for candidate in &["php-cs-fixer", "./vendor/bin/php-cs-fixer"] {
        let result = std::process::Command::new("sh")
            .arg("-c")
            .arg(format!("which {0} 2>/dev/null || command -v {0} 2>/dev/null", candidate))
            .output();
        if let Ok(out) = result {
            if out.status.success() {
                let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !path.is_empty() {
                    return Some(path);
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn format_php(code: String) -> Result<String, String> {
    let fixer = find_php_cs_fixer().ok_or_else(|| {
        "php-cs-fixer not found. Install globally: composer global require friendsofphp/php-cs-fixer".to_string()
    })?;

    let mut temp = tempfile::Builder::new()
        .suffix(".php")
        .tempfile()
        .map_err(|e| e.to_string())?;

    let had_open_tag = code.trim_start().starts_with("<?");
    let php_code = if had_open_tag {
        code.clone()
    } else {
        format!("<?php\n{}", code)
    };

    temp.write_all(php_code.as_bytes()).map_err(|e| e.to_string())?;
    temp.flush().map_err(|e| e.to_string())?;

    let path = temp.path().to_string_lossy().to_string();

    let output = std::process::Command::new(&fixer)
        .args(["fix", &path, "--rules=@PSR12", "--using-cache=no"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("php-cs-fixer: {}", err.trim()));
    }

    let formatted = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;

    if !had_open_tag {
        let stripped = formatted
            .trim_start()
            .trim_start_matches("<?php")
            .trim_start_matches("<?")
            .trim_start_matches('\n')
            .to_string();
        return Ok(stripped);
    }

    Ok(formatted)
}

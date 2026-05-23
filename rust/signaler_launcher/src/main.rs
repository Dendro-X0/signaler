use std::env;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    match run() {
        Ok(status) => {
            std::process::exit(status.code().unwrap_or(0));
        }
        Err(error) => {
            eprintln!("signaler launcher error: {error}");
            eprintln!();
            eprintln!("Requirements:");
            eprintln!("  - Node.js 18 or newer on PATH");
            eprintln!("  - portable install with dist/bin.js next to this launcher");
            eprintln!();
            eprintln!("Try: node --version");
            std::process::exit(1);
        }
    }
}

fn run() -> Result<std::process::ExitStatus, String> {
    let install_root = resolve_install_root()?;
    let node = find_node_executable()?;
    let bin_js = install_root.join("dist").join("bin.js");
    if !bin_js.is_file() {
        return Err(format!(
            "missing CLI entrypoint at {} (install root: {})",
            bin_js.display(),
            install_root.display()
        ));
    }

    let args: Vec<String> = env::args().skip(1).collect();
    let mut command = Command::new(&node);
    command.arg(&bin_js);
    command.args(args);
    command
        .status()
        .map_err(|error| format!("failed to spawn Node.js ({node}): {error}"))
}

fn resolve_install_root() -> Result<PathBuf, String> {
    if let Ok(value) = env::var("SIGNALER_INSTALL_ROOT") {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            let path = PathBuf::from(trimmed);
            if path.join("dist").join("bin.js").is_file() {
                return Ok(path);
            }
        }
    }

    let current_exe = env::current_exe().map_err(|error| error.to_string())?;
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Some(parent) = current_exe.parent() {
        candidates.push(parent.to_path_buf());
        if parent.file_name().is_some_and(|name| name == "bin") {
            if let Some(grandparent) = parent.parent() {
                candidates.push(grandparent.to_path_buf());
            }
        }
    }
    candidates.push(env::current_dir().map_err(|error| error.to_string())?);

    for candidate in candidates {
        if candidate.join("dist").join("bin.js").is_file() {
            return Ok(candidate);
        }
    }

    Err(format!(
        "could not resolve Signaler install root from launcher path {}",
        current_exe.display()
    ))
}

fn find_node_executable() -> Result<String, String> {
    let node = if cfg!(windows) { "node.exe" } else { "node" };
    let output = Command::new(if cfg!(windows) { "where" } else { "which" })
        .arg(node)
        .output()
        .map_err(|error| format!("failed to locate Node.js: {error}"))?;
    if !output.status.success() {
        return Err("Node.js was not found on PATH (requires Node 18+)".to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let first = stdout
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .ok_or_else(|| "Node.js was not found on PATH (requires Node 18+)".to_string())?;
    Ok(first.to_string())
}

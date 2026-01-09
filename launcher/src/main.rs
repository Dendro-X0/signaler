use clap::{Parser, Subcommand};
use serde::Serialize;
use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::process::{Command as ProcessCommand, ExitCode};

#[derive(Parser)]
#[command(name = "signaler", version, about = "Signaler launcher")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Doctor(DoctorArgs),
    Engine(EngineArgs),
    Run(RunArgs),
    Update(UpdateArgs),
}

#[derive(Parser)]
struct DoctorArgs {
    #[arg(long, default_value_t = false)]
    json: bool,
}

#[derive(Parser)]
struct EngineArgs {
    #[command(subcommand)]
    command: EngineCommand,
}

#[derive(Subcommand)]
enum EngineCommand {
    Run(EngineRunArgs),
    Path(EnginePathArgs),
    Resolve(EngineResolveArgs),
}

#[derive(Parser)]
struct EnginePathArgs {
    #[arg(long, default_value_t = false)]
    json: bool,
}

#[derive(Parser)]
struct EngineResolveArgs {
    #[arg(long, default_value_t = false)]
    json: bool,
}

#[derive(Parser)]
struct EngineRunArgs {
    #[arg(last = true, trailing_var_arg = true)]
    args: Vec<String>,
}

#[derive(Parser)]
struct RunArgs {
    #[command(subcommand)]
    command: RunCommand,
}

#[derive(Subcommand)]
enum RunCommand {
    Audit(RunModeArgs),
    Folder(RunModeArgs),
}

#[derive(Parser)]
struct RunModeArgs {
    #[arg(long, default_value_t = false)]
    json: bool,
    #[arg(last = true, trailing_var_arg = true)]
    args: Vec<String>,
}

#[derive(Parser)]
struct UpdateArgs {
    #[arg(long, default_value_t = false)]
    check: bool,
}

#[derive(Clone, Deserialize)]
struct EngineManifest {
    schema_version: u32,
    engine_version: String,
    min_node: String,
    entry: String,
    default_output_dir_name: String,
}

#[derive(Deserialize)]
struct EngineManifestRaw {
    #[serde(rename = "schemaVersion")]
    schema_version: u32,
    #[serde(rename = "engineVersion")]
    engine_version: String,
    #[serde(rename = "minNode")]
    min_node: String,
    entry: String,
    #[serde(rename = "defaultOutputDirName")]
    default_output_dir_name: String,
}

fn resolve_cache_dir() -> PathBuf {
    if cfg!(target_os = "windows") {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            return PathBuf::from(local_app_data).join("signaler");
        }
    }
    if let Ok(xdg_cache) = std::env::var("XDG_CACHE_HOME") {
        return PathBuf::from(xdg_cache).join("signaler");
    }
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".cache").join("signaler");
    }
    std::env::temp_dir().join("signaler")
}

fn resolve_cached_engine_manifest_path() -> PathBuf {
    resolve_cache_dir().join("engine").join("engine.manifest.json")
}

#[derive(Clone)]
struct EngineManifestInfo {
    manifest_path: PathBuf,
    manifest: EngineManifest,
    from_cache: bool,
    cache_dir: PathBuf,
}

fn resolve_engine_manifest_info() -> anyhow::Result<EngineManifestInfo> {
    let cache_dir = resolve_cache_dir();
    let cached = resolve_cached_engine_manifest_path();
    if cached.exists() {
        let manifest = read_engine_manifest(&cached)?;
        return Ok(EngineManifestInfo { manifest_path: cached, manifest, from_cache: true, cache_dir });
    }
    let exe = std::env::current_exe()?;
    let exe_dir = exe.parent().ok_or_else(|| anyhow::anyhow!("Could not resolve launcher directory"))?;
    let local = exe_dir.join("engine.manifest.json");
    if local.exists() {
        let manifest = read_engine_manifest(&local)?;
        return Ok(EngineManifestInfo { manifest_path: local, manifest, from_cache: false, cache_dir });
    }
    let parent = exe_dir.parent().map(|p| p.join("engine.manifest.json"));
    if let Some(p) = parent {
        if p.exists() {
            let manifest = read_engine_manifest(&p)?;
            return Ok(EngineManifestInfo { manifest_path: p, manifest, from_cache: false, cache_dir });
        }
    }
    anyhow::bail!("engine.manifest.json not found next to launcher (searched {local:?})")
}

fn resolve_engine_manifest_path() -> anyhow::Result<PathBuf> {
    Ok(resolve_engine_manifest_info()?.manifest_path)
}

fn read_engine_manifest(path: &Path) -> anyhow::Result<EngineManifest> {
    let raw = std::fs::read_to_string(path)?;
    let parsed: EngineManifestRaw = serde_json::from_str(&raw)?;
    Ok(EngineManifest {
        schema_version: parsed.schema_version,
        engine_version: parsed.engine_version,
        min_node: parsed.min_node,
        entry: parsed.entry,
        default_output_dir_name: parsed.default_output_dir_name,
    })
}

fn resolve_engine_entry_from_info(info: &EngineManifestInfo) -> anyhow::Result<PathBuf> {
    if info.manifest.schema_version != 1 {
        anyhow::bail!("Unsupported engine manifest schemaVersion: {}", info.manifest.schema_version);
    }
    let base = info.manifest_path.parent().ok_or_else(|| anyhow::anyhow!("manifest has no parent directory"))?;
    let entry_path = base.join(&info.manifest.entry);
    if !entry_path.exists() {
        anyhow::bail!("Engine entry not found: {}", entry_path.display());
    }
    Ok(entry_path)
}

#[derive(Serialize)]
struct EngineCacheLayout {
    schema_version: u32,
    cache_dir: String,
    engines_dir: String,
    latest_dir: String,
    version_dir: String,
    selected_dir: String,
    expected_engine_root: String,
    selection_kind: String,
    selection_value: String,
    selection_state: String,
    latest_available: bool,
    latest_manifest_version: Option<String>,
    latest_matches_manifest: bool,
    manifest_engine_version: String,
}

#[derive(Serialize)]
struct EngineResolutionReport {
    schema_version: u32,
    manifest_path: String,
    entry_path: String,
    manifest_source: String,
    cache_layout: EngineCacheLayout,
}

fn build_cache_layout(info: &EngineManifestInfo) -> EngineCacheLayout {
    let engines_dir = info.cache_dir.join("engine");
    let latest_dir = engines_dir.join("latest");
    let version_dir = engines_dir.join(&info.manifest.engine_version);
    let selection_kind = "manifest_version".to_string();
    let selection_value = info.manifest.engine_version.clone();
    let expected_engine_root = version_dir.display().to_string();
    let latest_available = latest_dir.exists();
    let latest_manifest_version = read_engine_manifest(latest_dir.join("engine.manifest.json").as_path())
        .ok()
        .map(|m| m.engine_version);
    let latest_matches_manifest = match &latest_manifest_version {
        Some(v) => v == &info.manifest.engine_version,
        None => false,
    };
    let selection_state = if latest_matches_manifest { "latest" } else { "pinned" }.to_string();
    EngineCacheLayout {
        schema_version: 1,
        cache_dir: info.cache_dir.display().to_string(),
        engines_dir: engines_dir.display().to_string(),
        latest_dir: latest_dir.display().to_string(),
        version_dir: version_dir.display().to_string(),
        selected_dir: version_dir.display().to_string(),
        expected_engine_root,
        selection_kind,
        selection_value,
        selection_state,
        latest_available,
        latest_manifest_version,
        latest_matches_manifest,
        manifest_engine_version: info.manifest.engine_version.clone(),
    }
}

fn build_engine_resolution_report(info: &EngineManifestInfo) -> anyhow::Result<EngineResolutionReport> {
    let entry_path = resolve_engine_entry_from_info(info)?;
    let manifest_source = if info.from_cache { "cache" } else { "local" }.to_string();
    Ok(EngineResolutionReport {
        schema_version: 1,
        manifest_path: info.manifest_path.display().to_string(),
        entry_path: entry_path.display().to_string(),
        manifest_source,
        cache_layout: build_cache_layout(info),
    })
}

#[derive(Serialize)]
struct EngineRunReport {
    schema_version: u32,
    mode: String,
    manifest_path: String,
    entry_path: String,
    forwarded_args: Vec<String>,
    success: bool,
    exit_code: Option<i32>,
    cache_layout: EngineCacheLayout,
}

fn run_engine_capture_status(info: &EngineManifestInfo, args: &EngineRunArgs) -> anyhow::Result<std::process::ExitStatus> {
    let entry_path = resolve_engine_entry_from_info(info)?;
    let mut cmd = ProcessCommand::new("node");
    cmd.arg(entry_path);
    for a in &args.args {
        cmd.arg(a);
    }
    Ok(cmd.status()?)
}

fn run_engine(info: EngineManifestInfo, args: EngineRunArgs) -> anyhow::Result<ExitCode> {
    let status = run_engine_capture_status(&info, &args)?;
    if status.success() {
        return Ok(ExitCode::SUCCESS);
    }
    Ok(ExitCode::from(1))
}

fn run_engine_mode(info: EngineManifestInfo, mode: &str, args: RunModeArgs) -> anyhow::Result<ExitCode> {
    let mut forwarded: Vec<String> = Vec::with_capacity(args.args.len() + 1);
    forwarded.push(mode.to_string());
    forwarded.extend(args.args);
    let engine_args = EngineRunArgs { args: forwarded };
    if args.json {
        let entry_path = resolve_engine_entry_from_info(&info)?;
        let status = run_engine_capture_status(&info, &engine_args)?;
        let report = EngineRunReport {
            schema_version: 1,
            mode: mode.to_string(),
            manifest_path: info.manifest_path.display().to_string(),
            entry_path: entry_path.display().to_string(),
            forwarded_args: engine_args.args.clone(),
            success: status.success(),
            exit_code: status.code(),
            cache_layout: build_cache_layout(&info),
        };
        println!("{}", serde_json::to_string_pretty(&report)?);
        return Ok(if status.success() { ExitCode::SUCCESS } else { ExitCode::from(1) });
    }
    run_engine(info, engine_args)
}

#[derive(Serialize)]
struct DoctorReport {
    ok: bool,
    node: CheckResult,
    browser: CheckResult,
}

#[derive(Serialize)]
struct CheckResult {
    ok: bool,
    detail: String,
}

fn run_command_capture_stdout(program: &str, args: &[&str]) -> anyhow::Result<String> {
    let output = ProcessCommand::new(program).args(args).output()?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if output.status.success() {
        return Ok(stdout);
    }
    let message = if !stderr.is_empty() { stderr } else { stdout };
    anyhow::bail!("{program} failed: {message}");
}

fn parse_node_major(version: &str) -> Option<u32> {
    let trimmed = version.trim();
    let without_v = trimmed.strip_prefix('v').unwrap_or(trimmed);
    let major_text = without_v.split('.').next()?;
    major_text.parse::<u32>().ok()
}

fn check_node(min_major: u32) -> CheckResult {
    let version = match run_command_capture_stdout("node", &["--version"]) {
        Ok(v) => v,
        Err(err) => {
            return CheckResult {
                ok: false,
                detail: format!("Node not found or not runnable: {err}"),
            };
        }
    };
    let major = parse_node_major(&version);
    match major {
        Some(m) if m >= min_major => CheckResult {
            ok: true,
            detail: format!("{version} (>= {min_major})"),
        },
        Some(m) => CheckResult {
            ok: false,
            detail: format!("{version} (major {m}) is below required {min_major}"),
        },
        None => CheckResult {
            ok: false,
            detail: format!("Unrecognized Node version string: {version}"),
        },
    }
}

fn find_first_existing_browser() -> Option<String> {
    let candidates: [&str; 5] = [
        r"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        r"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        r"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        r"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        r"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    ];
    for path in candidates {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }
    None
}

fn check_browser() -> CheckResult {
    match find_first_existing_browser() {
        Some(path) => CheckResult {
            ok: true,
            detail: path,
        },
        None => CheckResult {
            ok: false,
            detail: "No supported browser executable found (Chrome/Edge/Brave)".to_string(),
        },
    }
}

fn run_doctor(args: DoctorArgs) -> anyhow::Result<ExitCode> {
    let node = check_node(20);
    let browser = check_browser();
    let ok = node.ok && browser.ok;
    let report = DoctorReport { ok, node, browser };
    if args.json {
        println!("{}", serde_json::to_string_pretty(&report)?);
    } else {
        println!("Node: {}", report.node.detail);
        println!("Browser: {}", report.browser.detail);
        println!("OK: {}", if report.ok { "yes" } else { "no" });
    }
    Ok(if ok { ExitCode::SUCCESS } else { ExitCode::from(1) })
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    match cli.command {
        Command::Doctor(args) => match run_doctor(args) {
            Ok(code) => code,
            Err(err) => {
                eprintln!("doctor failed: {err}");
                ExitCode::from(1)
            }
        },
        Command::Engine(args) => {
            let manifest_info = match resolve_engine_manifest_info() {
                Ok(p) => p,
                Err(err) => {
                    eprintln!("engine failed: {err}");
                    return ExitCode::from(1);
                }
            };
            match args.command {
                EngineCommand::Path(cmd_args) => {
                    if cmd_args.json {
                        match build_engine_resolution_report(&manifest_info) {
                            Ok(report) => {
                                println!("{}", serde_json::to_string_pretty(&report)?);
                                return ExitCode::SUCCESS;
                            }
                            Err(err) => {
                                eprintln!("engine failed: {err}");
                                return ExitCode::from(1);
                            }
                        }
                    }
                    println!("{}", manifest_info.manifest_path.display());
                    ExitCode::SUCCESS
                }
                EngineCommand::Resolve(cmd_args) => {
                    if cmd_args.json {
                        match build_engine_resolution_report(&manifest_info) {
                            Ok(report) => {
                                println!("{}", serde_json::to_string_pretty(&report)?);
                                ExitCode::SUCCESS
                            }
                            Err(err) => {
                                eprintln!("engine failed: {err}");
                                ExitCode::from(1)
                            }
                        }
                    } else {
                        match resolve_engine_entry_from_info(&manifest_info) {
                            Ok(path) => {
                                println!("{}", path.display());
                                ExitCode::SUCCESS
                            }
                            Err(err) => {
                                eprintln!("engine failed: {err}");
                                ExitCode::from(1)
                            }
                        }
                    }
                }
                EngineCommand::Run(run_args) => match run_engine(manifest_info.clone(), run_args) {
                    Ok(code) => code,
                    Err(err) => {
                        eprintln!("engine failed: {err}");
                        ExitCode::from(1)
                    }
                },
            }
        }
        Command::Run(args) => {
            let manifest_info = match resolve_engine_manifest_info() {
                Ok(p) => p,
                Err(err) => {
                    eprintln!("run failed: {err}");
                    return ExitCode::from(1);
                }
            };
            match args.command {
                RunCommand::Audit(run_args) => match run_engine_mode(manifest_info.clone(), "audit", run_args) {
                    Ok(code) => code,
                    Err(err) => {
                        eprintln!("run failed: {err}");
                        ExitCode::from(1)
                    }
                },
                RunCommand::Folder(run_args) => match run_engine_mode(manifest_info, "folder", run_args) {
                    Ok(code) => code,
                    Err(err) => {
                        eprintln!("run failed: {err}");
                        ExitCode::from(1)
                    }
                },
            }
        }
        Command::Update(args) => {
            let cache_dir = resolve_cache_dir();
            if args.check {
                println!("update: not implemented (cacheDir: {})", cache_dir.display());
                return ExitCode::SUCCESS;
            }
            println!("update: not implemented (cacheDir: {})", cache_dir.display());
            ExitCode::from(1)
        }
    }
}

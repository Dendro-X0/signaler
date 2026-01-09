use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::{Child, CommandEvent};
use tauri_plugin_shell::ShellExt;

type SharedChild = Mutex<Option<Child>>;

type SharedLastOutputDir = Mutex<Option<String>>;

type SharedHistory = Mutex<Vec<HistoryEntry>>;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoryEntry {
  id: String,
  created_at: String,
  mode: String,
  target: String,
  output_dir: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartRunResult {
  output_dir: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ApexConfig {
  base_url: String,
  pages: Vec<ApexPageConfig>,
  warm_up: bool,
  incremental: bool,
  parallel: u32,
  throttling_method: String,
  cpu_slowdown_multiplier: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ApexPageConfig {
  path: String,
  label: String,
  devices: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EngineRunIndex {
  artifacts: Vec<EngineRunIndexArtifact>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EngineRunIndexArtifact {
  kind: String,
  relative_path: String,
}

const DEFAULT_DEVICES: [&str; 2] = ["mobile", "desktop"];

#[tauri::command]
async fn start_run(
  app: AppHandle,
  child_state: State<'_, SharedChild>,
  last_output_dir: State<'_, SharedLastOutputDir>,
  history: State<'_, SharedHistory>,
  mode: String,
  value: String,
) -> Result<StartRunResult, String> {
  let mut child_guard = child_state.lock().map_err(|_| "child lock poisoned".to_string())?;
  if child_guard.is_some() {
    return Err("run already in progress".to_string());
  }
  let output_dir = resolve_default_output_dir(&app);
  *last_output_dir.lock().map_err(|_| "output dir lock poisoned".to_string())? = Some(output_dir.clone());
  persist_history_entry(&app, &history, HistoryEntry {
    id: new_id(),
    created_at: now_iso(),
    mode: mode.clone(),
    target: value.clone(),
    output_dir: output_dir.clone(),
  })?;
  let mut args: Vec<String> = vec!["run".to_string()];
  if mode == "folder" {
    args.push("folder".to_string());
    args.push("--engine-json".to_string());
    args.push("--output-dir".to_string());
    args.push(output_dir.clone());
    args.push("--".to_string());
    args.push("--root".to_string());
    args.push(value);
  } else {
    let config_path = write_url_mode_config(&output_dir, &value)?;
    args.push("audit".to_string());
    args.push("--engine-json".to_string());
    args.push("--output-dir".to_string());
    args.push(output_dir.clone());
    args.push("--".to_string());
    args.push("--config".to_string());
    args.push(config_path);
  }
  let sidecar = app.shell().sidecar("signaler").map_err(|e| e.to_string())?;
  let (mut rx, child) = sidecar.args(args).spawn().map_err(|e| e.to_string())?;
  *child_guard = Some(child);
  let app_clone = app.clone();
  tauri::async_runtime::spawn(async move {
    while let Some(event) = rx.recv().await {
      match event {
        CommandEvent::Stdout(bytes) => {
          let line = String::from_utf8_lossy(&bytes).trim().to_string();
          if line.is_empty() {
            continue;
          }
          if let Ok(json) = serde_json::from_str::<Value>(&line) {
            let _ = app_clone.emit("engine_event", json);
          } else {
            let _ = app_clone.emit("engine_event", Value::String(line));
          }
        }
        CommandEvent::Stderr(bytes) => {
          let line = String::from_utf8_lossy(&bytes).trim().to_string();
          if !line.is_empty() {
            let _ = app_clone.emit("engine_event", Value::String(line));
          }
        }
        CommandEvent::Terminated(_) => {
          let _ = app_clone.emit("engine_event", Value::Object(serde_json::Map::from_iter([(
            "type".to_string(),
            Value::String("launcher_terminated".to_string()),
          )])));
          break;
        }
        _ => {}
      }
    }
    let state: Option<State<'_, SharedChild>> = app_clone.try_state();
    if let Some(s) = state {
      if let Ok(mut g) = s.lock() {
        *g = None;
      }
    }
  });
  Ok(StartRunResult { output_dir })
}

#[tauri::command]
async fn cancel_run(child_state: State<'_, SharedChild>) -> Result<(), String> {
  let mut guard = child_state.lock().map_err(|_| "child lock poisoned".to_string())?;
  if let Some(child) = guard.as_mut() {
    child.kill().map_err(|e| e.to_string())?;
  }
  *guard = None;
  Ok(())
}

#[tauri::command]
async fn open_path(app: AppHandle, path: String) -> Result<(), String> {
  tauri_plugin_opener::open_path(&app, path, None).map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(non_snake_case)]
async fn open_report(app: AppHandle, outputDir: String) -> Result<(), String> {
  let run_path = std::path::PathBuf::from(&outputDir).join("run.json");
  let raw = std::fs::read_to_string(&run_path).map_err(|e| e.to_string())?;
  let index = serde_json::from_str::<EngineRunIndex>(&raw).map_err(|e| e.to_string())?;
  let report_rel = index
    .artifacts
    .iter()
    .find(|a| a.kind == "file" && a.relative_path == "report.html")
    .map(|a| a.relative_path.as_str())
    .ok_or_else(|| "report.html not found in run.json artifacts".to_string())?;
  let report_path = std::path::PathBuf::from(outputDir).join(report_rel);
  tauri_plugin_opener::open_path(&app, report_path.display().to_string(), None).map_err(|e| e.to_string())
}

#[tauri::command]
async fn list_history(app: AppHandle, history: State<'_, SharedHistory>) -> Result<Vec<HistoryEntry>, String> {
  let loaded = load_history(&app).unwrap_or_default();
  let mut guard = history.lock().map_err(|_| "history lock poisoned".to_string())?;
  if guard.is_empty() {
    *guard = loaded;
  }
  Ok(guard.clone())
}

fn resolve_default_output_dir(app: &AppHandle) -> String {
  let base = app
    .path()
    .app_data_dir()
    .unwrap_or(std::env::temp_dir());
  let dir = base.join("runs").join(new_id());
  dir.display().to_string()
}

fn write_url_mode_config(output_dir: &str, base_url: &str) -> Result<String, String> {
  let out_path = std::path::PathBuf::from(output_dir);
  std::fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
  let config_path = out_path.join("apex.config.json");
  let config = ApexConfig {
    base_url: base_url.to_string(),
    pages: vec![ApexPageConfig {
      path: "/".to_string(),
      label: "home".to_string(),
      devices: DEFAULT_DEVICES.iter().map(|d| d.to_string()).collect(),
    }],
    warm_up: false,
    incremental: false,
    parallel: 1,
    throttling_method: "simulate".to_string(),
    cpu_slowdown_multiplier: 4,
  };
  let raw = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
  std::fs::write(&config_path, format!("{}\n", raw)).map_err(|e| e.to_string())?;
  Ok(config_path.display().to_string())
}

fn history_path(app: &AppHandle) -> std::path::PathBuf {
  let base = app
    .path()
    .app_data_dir()
    .unwrap_or(std::env::temp_dir());
  base.join("history.json")
}

fn load_history(app: &AppHandle) -> Option<Vec<HistoryEntry>> {
  let path = history_path(app);
  let raw = std::fs::read_to_string(path).ok()?;
  serde_json::from_str::<Vec<HistoryEntry>>(&raw).ok()
}

fn persist_history_entry(app: &AppHandle, history: &State<'_, SharedHistory>, entry: HistoryEntry) -> Result<(), String> {
  let mut guard = history.lock().map_err(|_| "history lock poisoned".to_string())?;
  guard.insert(0, entry);
  if guard.len() > 100 {
    guard.truncate(100);
  }
  let path = history_path(app);
  if let Some(parent) = path.parent() {
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }
  let raw = serde_json::to_string_pretty(&*guard).map_err(|e| e.to_string())?;
  std::fs::write(path, format!("{}\n", raw)).map_err(|e| e.to_string())?;
  Ok(())
}

fn now_iso() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let ms = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
  format!("{}", ms)
}

fn new_id() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let ms = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
  format!("run-{}", ms)
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_opener::init())
    .manage(Mutex::new(None::<Child>))
    .manage(Mutex::new(None::<String>))
    .manage(Mutex::new(Vec::<HistoryEntry>::new()))
    .invoke_handler(tauri::generate_handler![start_run, cancel_run, open_path, open_report, list_history])
    .run(tauri::generate_context!())
    .expect("error while running app");
}

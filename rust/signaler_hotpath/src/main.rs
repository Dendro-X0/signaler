
use chrono::DateTime;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet, VecDeque};
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, ExitCode, Stdio};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::thread;
use std::time::{Duration, Instant};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Clone)]
struct RouteEntry {
    path: String,
    label: String,
    source: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiscoverScanOutput {
    status: String,
    detector_id: String,
    route_count: usize,
    routes: Vec<RouteEntry>,
    elapsed_ms: u128,
    message: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct TopIssue {
    id: String,
    title: String,
    count: usize,
    total_ms: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcessSummaryOutput {
    status: String,
    top_issues: Vec<TopIssue>,
    elapsed_ms: u128,
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
struct NetWorkerInput {
    schema_version: u32,
    mode: String,
    base_url: String,
    parallel: usize,
    timeout_ms: u64,
    retry_policy: String,
    tasks: Vec<Value>,
    options: HashMap<String, Value>,
}

#[derive(Debug, Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
struct NetWorkerStats {
    attempted: usize,
    succeeded: usize,
    failed: usize,
    retries: usize,
    cooldown_pauses: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NetWorkerOutput {
    schema_version: u32,
    status: String,
    mode: String,
    elapsed_ms: u128,
    used_fallback_safe_defaults: bool,
    results: Vec<Value>,
    stats: NetWorkerStats,
    error_message: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RunCoreWarmUp {
    enabled: bool,
    sample_size: Option<usize>,
    concurrency: Option<usize>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RunCoreWorker {
    command: String,
    args: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RunCoreTask {
    url: String,
    path: String,
    label: String,
    device: String,
    page_scope: Option<String>,
    log_level: String,
    throttling_method: String,
    cpu_slowdown_multiplier: f64,
    timeout_ms: u64,
    only_categories: Option<Vec<String>>,
    capture_level: Option<String>,
    output_dir: String,
    runs: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunCoreInput {
    schema_version: u32,
    mode: String,
    base_url: String,
    parallel: usize,
    runs_per_combo: usize,
    throttling_method: String,
    cpu_slowdown_multiplier: f64,
    session_isolation: String,
    throughput_backoff: String,
    warm_up: RunCoreWarmUp,
    audit_timeout_ms: u64,
    capture_level: String,
    output_dir: String,
    tasks: Vec<RunCoreTask>,
    worker: RunCoreWorker,
}

#[derive(Debug, Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
struct RunCoreStepTimings {
    warm_up_ms: u128,
    queue_build_ms: u128,
    run_loop_ms: u128,
    reduction_ms: u128,
    total_ms: u128,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RunCoreExecution {
    elapsed_ms: u128,
    attempted_tasks: usize,
    completed_tasks: usize,
    step_timings: RunCoreStepTimings,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RunCoreRunnerStability {
    backoff_policy: String,
    initial_parallel: usize,
    final_parallel: usize,
    total_attempts: usize,
    total_failures: usize,
    total_retries: usize,
    reductions: usize,
    cooldown_pauses: usize,
    failure_rate: f64,
    retry_rate: f64,
    max_consecutive_retries: usize,
    cooldown_ms_total: u128,
    recovery_increases: usize,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RunCoreOutput {
    schema_version: u32,
    status: String,
    results: Vec<Value>,
    runner_stability: RunCoreRunnerStability,
    execution: RunCoreExecution,
    fallback_safe_defaults_used: bool,
    error_message: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReduceProtocolInput {
    mode: String,
    profile: String,
    comparability_hash: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReducePolicyInput {
    zero_impact_filter: bool,
    min_confidence: String,
    max_suggestions: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReduceSignalsInput {
    schema_version: u32,
    summary_path: String,
    protocol: ReduceProtocolInput,
    policy: ReducePolicyInput,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ReduceIssue {
    id: String,
    title: String,
    count: usize,
    total_ms: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReduceSignalsOutput {
    schema_version: u32,
    status: String,
    top_issues: Vec<ReduceIssue>,
    suggestions: Vec<Value>,
    stats: ReduceSignalsStats,
    error_message: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReduceSignalsStats {
    elapsed_ms: u128,
    issue_count: usize,
    suggestion_count: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BenchmarkNormalizeInput {
    schema_version: u32,
    input_files: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BenchmarkNormalizeEvidence {
    source_rel_path: String,
    pointer: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    artifact_rel_path: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BenchmarkNormalizeTarget {
    issue_id: String,
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    device: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct BenchmarkNormalizeRecord {
    source_id: String,
    collected_at: String,
    collected_at_ms: i64,
    id: String,
    target: BenchmarkNormalizeTarget,
    confidence: String,
    evidence: Vec<BenchmarkNormalizeEvidence>,
    #[serde(skip_serializing_if = "Option::is_none")]
    metrics: Option<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BenchmarkNormalizeStats {
    elapsed_ms: u128,
    records_count: usize,
    input_records_count: usize,
    deduped_records_count: usize,
    records_digest: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BenchmarkNormalizeOutput {
    schema_version: u32,
    status: String,
    input_files: Vec<String>,
    source_ids: Vec<String>,
    records: Vec<BenchmarkNormalizeRecord>,
    stats: BenchmarkNormalizeStats,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_message: Option<String>,
}

fn usage() {
    eprintln!("Usage:");
    eprintln!("  signaler_hotpath discover-scan --project-root <path> --limit <n> --preferred-detector <id|auto> --out <path>");
    eprintln!("  signaler_hotpath process-summary --summary <path> --out <path>");
    eprintln!("  signaler_hotpath net-worker --mode <health|headers|links|console> --in <path> --out <path>");
    eprintln!("  signaler_hotpath run-core --in <path> --out <path>");
    eprintln!("  signaler_hotpath reduce-signals --in <path> --out <path>");
    eprintln!("  signaler_hotpath normalize-benchmark --in <path> --out <path>");
    eprintln!("  signaler_hotpath normalize-benchmark-signals --in <path> --out <path>");
}

fn parse_flag(args: &[String], flag: &str) -> Option<String> {
    let mut index = 0usize;
    while index < args.len() {
        if args[index] == flag && index + 1 < args.len() {
            return Some(args[index + 1].clone());
        }
        index += 1;
    }
    None
}

fn ensure_parent_dir(path: &str) -> Result<(), String> {
    if let Some(parent) = Path::new(path).parent() {
        fs::create_dir_all(parent).map_err(|err| format!("failed to create parent dir '{}': {}", parent.display(), err))?;
    }
    Ok(())
}

fn write_json_file<T: Serialize>(path: &str, value: &T) -> Result<(), String> {
    ensure_parent_dir(path)?;
    let body = serde_json::to_string_pretty(value).map_err(|err| format!("failed to serialize JSON: {}", err))?;
    fs::write(path, format!("{}\n", body)).map_err(|err| format!("failed to write '{}': {}", path, err))
}

fn normalize_path_slashes(path: &str) -> String {
    path.replace('\\', "/")
}

fn parse_non_empty_string(value: Option<&Value>, context: &str) -> Result<String, String> {
    value
        .and_then(|row| row.as_str())
        .map(str::trim)
        .filter(|row| !row.is_empty())
        .map(|row| row.to_string())
        .ok_or_else(|| context.to_string())
}

fn parse_collected_at_millis(value: &str) -> Result<i64, String> {
    DateTime::parse_from_rfc3339(value)
        .map(|row| row.timestamp_millis())
        .map_err(|_| "Invalid benchmark source collectedAt timestamp.".to_string())
}

fn parse_benchmark_evidence_rows(value: Option<&Value>) -> Result<Vec<BenchmarkNormalizeEvidence>, String> {
    let rows = value
        .and_then(|row| row.as_array())
        .ok_or_else(|| "Invalid benchmark signal evidence: expected array.".to_string())?;
    let mut evidence: Vec<BenchmarkNormalizeEvidence> = Vec::new();
    for row in rows {
        let object = row
            .as_object()
            .ok_or_else(|| "Invalid benchmark signal evidence row: expected object.".to_string())?;
        let source_rel_path = parse_non_empty_string(
            object.get("sourceRelPath"),
            "Invalid benchmark signal evidence row: sourceRelPath and pointer are required.",
        )?;
        let pointer = parse_non_empty_string(
            object.get("pointer"),
            "Invalid benchmark signal evidence row: sourceRelPath and pointer are required.",
        )?;
        let artifact_rel_path = object
            .get("artifactRelPath")
            .and_then(|entry| entry.as_str())
            .map(str::trim)
            .filter(|entry| !entry.is_empty())
            .map(|entry| entry.to_string());
        evidence.push(BenchmarkNormalizeEvidence {
            source_rel_path,
            pointer,
            artifact_rel_path,
        });
    }
    evidence.sort_by(|a, b| {
        let source_delta = a.source_rel_path.cmp(&b.source_rel_path);
        if source_delta != std::cmp::Ordering::Equal {
            return source_delta;
        }
        let pointer_delta = a.pointer.cmp(&b.pointer);
        if pointer_delta != std::cmp::Ordering::Equal {
            return pointer_delta;
        }
        a.artifact_rel_path.as_deref().unwrap_or("").cmp(b.artifact_rel_path.as_deref().unwrap_or(""))
    });
    evidence.dedup_by(|a, b| {
        a.source_rel_path == b.source_rel_path
            && a.pointer == b.pointer
            && a.artifact_rel_path == b.artifact_rel_path
    });
    Ok(evidence)
}

fn parse_non_negative_metric(object: &serde_json::Map<String, Value>, key: &str) -> Option<f64> {
    let value = object.get(key)?;
    let number = value.as_f64()?;
    if !number.is_finite() || number < 0.0 {
        return None;
    }
    Some(number)
}

fn parse_benchmark_metrics(source_id: &str, value: Option<&Value>) -> Result<Option<Value>, String> {
    let object = match value {
        Some(row) => row
            .as_object()
            .ok_or_else(|| "Invalid benchmark signal metrics: expected object.".to_string())?,
        None => return Ok(None),
    };

    let metric_keys: &[&str] = match source_id {
        "accessibility-extended" => &[
            "wcagViolationCount",
            "seriousViolationCount",
            "criticalViolationCount",
            "ariaPatternMismatchCount",
            "focusAppearanceIssueCount",
            "focusNotObscuredIssueCount",
            "targetSizeIssueCount",
            "draggingAlternativeIssueCount",
            "apgPatternMismatchCount",
            "keyboardSupportIssueCount",
        ],
        "security-baseline" => &[
            "missingHeaderCount",
            "tlsConfigIssueCount",
            "cookiePolicyIssueCount",
            "mixedContentCount",
        ],
        "seo-technical" => &[
            "indexabilityIssueCount",
            "canonicalMismatchCount",
            "structuredDataErrorCount",
            "crawlabilityIssueCount",
        ],
        "reliability-slo" => &["availabilityPct", "errorRatePct", "latencyP95Ms"],
        "cross-browser-parity" => &["scoreVariancePct", "lcpDeltaMs", "clsDelta"],
        _ => return Err("Invalid benchmark source id.".to_string()),
    };

    let mut metrics_map = serde_json::Map::new();
    for key in metric_keys {
        if let Some(number) = parse_non_negative_metric(object, key) {
            metrics_map.insert((*key).to_string(), json!(number));
        }
    }
    if metrics_map.is_empty() && !object.is_empty() {
        return Err(format!("Invalid {} metrics values.", source_id));
    }
    if metrics_map.is_empty() {
        return Ok(None);
    }
    Ok(Some(Value::Object(metrics_map)))
}

fn compare_benchmark_records(a: &BenchmarkNormalizeRecord, b: &BenchmarkNormalizeRecord) -> std::cmp::Ordering {
    let source_delta = a.source_id.cmp(&b.source_id);
    if source_delta != std::cmp::Ordering::Equal {
        return source_delta;
    }
    let issue_delta = a.target.issue_id.cmp(&b.target.issue_id);
    if issue_delta != std::cmp::Ordering::Equal {
        return issue_delta;
    }
    let path_delta = a.target.path.cmp(&b.target.path);
    if path_delta != std::cmp::Ordering::Equal {
        return path_delta;
    }
    let device_delta = a
        .target
        .device
        .as_deref()
        .unwrap_or("")
        .cmp(b.target.device.as_deref().unwrap_or(""));
    if device_delta != std::cmp::Ordering::Equal {
        return device_delta;
    }
    let collected_delta = a.collected_at_ms.cmp(&b.collected_at_ms);
    if collected_delta != std::cmp::Ordering::Equal {
        return collected_delta;
    }
    let collected_iso_delta = a.collected_at.cmp(&b.collected_at);
    if collected_iso_delta != std::cmp::Ordering::Equal {
        return collected_iso_delta;
    }
    let confidence_delta = a.confidence.cmp(&b.confidence);
    if confidence_delta != std::cmp::Ordering::Equal {
        return confidence_delta;
    }
    a.id.cmp(&b.id)
}

fn benchmark_metrics_key(metrics: &Option<Value>) -> String {
    match metrics {
        Some(value) => serde_json::to_string(value).unwrap_or_else(|_| String::new()),
        None => String::new(),
    }
}

fn benchmark_record_dedup_key(record: &BenchmarkNormalizeRecord) -> String {
    let mut evidence_parts: Vec<String> = Vec::new();
    for row in record.evidence.iter() {
        evidence_parts.push(format!(
            "{}|{}|{}",
            row.source_rel_path,
            row.pointer,
            row.artifact_rel_path.as_deref().unwrap_or("")
        ));
    }
    format!(
        "{}::{}::{}::{}::{}::{}::{}::{}::{}::{}",
        record.source_id,
        record.collected_at,
        record.collected_at_ms,
        record.id,
        record.target.issue_id,
        record.target.path,
        record.target.device.as_deref().unwrap_or(""),
        record.confidence,
        evidence_parts.join("||"),
        benchmark_metrics_key(&record.metrics)
    )
}

fn fnv1a_hex(input: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{:016x}", hash)
}

fn run_normalize_benchmark_signals(input_path: &str, out_path: &str) -> Result<(), String> {
    let started = Instant::now();
    let input_raw = fs::read_to_string(input_path).map_err(|err| format!("failed to read normalize input '{}': {}", input_path, err))?;
    let input: BenchmarkNormalizeInput = serde_json::from_str(&input_raw)
        .map_err(|err| format!("failed to parse normalize input '{}': {}", input_path, err))?;
    if input.schema_version != 1 {
        return Err("normalize input schemaVersion must be 1".to_string());
    }

    let mut deduped_files: Vec<String> = Vec::new();
    let mut seen_files: HashSet<String> = HashSet::new();
    for file in input.input_files {
        let normalized = normalize_path_slashes(&file);
        if normalized.is_empty() {
            continue;
        }
        if seen_files.insert(normalized.clone()) {
            deduped_files.push(normalized);
        }
    }

    let mut records: Vec<BenchmarkNormalizeRecord> = Vec::new();
    let mut source_set: HashSet<String> = HashSet::new();
    for file in deduped_files.iter() {
        let raw_text = fs::read_to_string(file).map_err(|err| format!("failed to read benchmark signals file '{}': {}", file, err))?;
        let parsed: Value = serde_json::from_str(&raw_text).map_err(|err| format!("failed to parse benchmark signals file '{}': {}", file, err))?;
        let root = parsed
            .as_object()
            .ok_or_else(|| format!("Invalid benchmark signals file '{}': expected object.", file))?;
        let schema_version = root.get("schemaVersion").and_then(|row| row.as_u64()).unwrap_or(0);
        if schema_version != 1 {
            return Err(format!(
                "Invalid benchmark signals file '{}': schemaVersion must be 1.",
                file
            ));
        }
        let sources = root
            .get("sources")
            .and_then(|row| row.as_array())
            .ok_or_else(|| format!("Invalid benchmark signals file '{}': sources must be an array.", file))?;
        for source in sources {
            let source_obj = source
                .as_object()
                .ok_or_else(|| format!("Invalid benchmark source entry in '{}': expected object.", file))?;
            let source_id = parse_non_empty_string(source_obj.get("sourceId"), "Invalid benchmark source id.")?;
            if source_id != "accessibility-extended"
                && source_id != "security-baseline"
                && source_id != "seo-technical"
                && source_id != "reliability-slo"
                && source_id != "cross-browser-parity"
            {
                return Err(format!("Invalid benchmark source id in '{}'.", file));
            }
            let collected_at = parse_non_empty_string(
                source_obj.get("collectedAt"),
                "Invalid benchmark source collectedAt timestamp.",
            )?;
            let collected_at_ms = parse_collected_at_millis(&collected_at)?;
            let source_records = source_obj
                .get("records")
                .and_then(|row| row.as_array())
                .ok_or_else(|| format!("Invalid benchmark source records in '{}': expected array.", file))?;

            source_set.insert(source_id.clone());
            for record in source_records {
                let record_obj = record
                    .as_object()
                    .ok_or_else(|| format!("Invalid benchmark source record in '{}': expected object.", file))?;
                let id = parse_non_empty_string(record_obj.get("id"), "Invalid benchmark source record id.")?;
                let target_obj = record_obj
                    .get("target")
                    .and_then(|row| row.as_object())
                    .ok_or_else(|| "Invalid benchmark source record target.".to_string())?;
                let issue_id = parse_non_empty_string(
                    target_obj.get("issueId"),
                    "Invalid benchmark source record target fields.",
                )?;
                let path = parse_non_empty_string(
                    target_obj.get("path"),
                    "Invalid benchmark source record target fields.",
                )?;
                let device = match target_obj.get("device") {
                    Some(row) => {
                        let parsed_device = parse_non_empty_string(Some(row), "Invalid benchmark source record target.device.")?;
                        if parsed_device != "mobile" && parsed_device != "desktop" {
                            return Err("Invalid benchmark source record target.device.".to_string());
                        }
                        Some(parsed_device)
                    }
                    None => None,
                };
                let confidence = parse_non_empty_string(
                    record_obj.get("confidence"),
                    "Invalid benchmark source record confidence.",
                )?;
                if confidence != "high" && confidence != "medium" && confidence != "low" {
                    return Err("Invalid benchmark source record confidence.".to_string());
                }
                let evidence = parse_benchmark_evidence_rows(record_obj.get("evidence"))?;
                let metrics = parse_benchmark_metrics(&source_id, record_obj.get("metrics"))?;

                records.push(BenchmarkNormalizeRecord {
                    source_id: source_id.clone(),
                    collected_at: collected_at.clone(),
                    collected_at_ms,
                    id,
                    target: BenchmarkNormalizeTarget {
                        issue_id,
                        path,
                        device,
                    },
                    confidence: confidence.clone(),
                    evidence,
                    metrics,
                });
            }
        }
    }

    let input_records_count = records.len();
    records.sort_by(compare_benchmark_records);
    let mut deduped_records: Vec<BenchmarkNormalizeRecord> = Vec::new();
    let mut seen_record_keys: HashSet<String> = HashSet::new();
    for record in records.into_iter() {
        let dedup_key = benchmark_record_dedup_key(&record);
        if !seen_record_keys.insert(dedup_key) {
            continue;
        }
        deduped_records.push(record);
    }

    let mut source_ids: Vec<String> = source_set.into_iter().collect();
    source_ids.sort();
    let records_digest = fnv1a_hex(&serde_json::to_string(&deduped_records).unwrap_or_else(|_| String::new()));
    let output = BenchmarkNormalizeOutput {
        schema_version: 1,
        status: "ok".to_string(),
        input_files: deduped_files,
        source_ids,
        stats: BenchmarkNormalizeStats {
            elapsed_ms: started.elapsed().as_millis(),
            records_count: deduped_records.len(),
            input_records_count,
            deduped_records_count: input_records_count.saturating_sub(deduped_records.len()),
            records_digest,
        },
        records: deduped_records,
        error_message: None,
    };
    write_json_file(out_path, &output)
}

fn normalize_route(raw: &str) -> String {
    let base = raw.trim().split(['?', '#']).next().unwrap_or("");
    let trimmed = base.trim_start_matches('/');
    if trimmed.is_empty() {
        return "/".to_string();
    }
    format!("/{}", trimmed.replace("//", "/"))
}

fn build_label(path: &str) -> String {
    if path == "/" {
        return "home".to_string();
    }
    let segment = path
        .split('/')
        .filter(|part| !part.is_empty())
        .last()
        .unwrap_or("page");
    segment.trim_start_matches(':').to_string()
}

fn has_allowed_script_ext(path: &Path) -> bool {
    let lower = path.to_string_lossy().to_lowercase();
    [".tsx", ".ts", ".jsx", ".js"].iter().any(|ext| lower.ends_with(ext))
}

fn is_next_app_page(path: &Path) -> bool {
    let lower = path.to_string_lossy().replace('\\', "/").to_lowercase();
    has_allowed_script_ext(path) && (lower.ends_with("/page.tsx") || lower.ends_with("/page.ts") || lower.ends_with("/page.jsx") || lower.ends_with("/page.js"))
}

fn is_next_pages_file(path: &Path, root: &Path) -> bool {
    let rel = path.strip_prefix(root).unwrap_or(path).to_string_lossy().replace('\\', "/");
    if !has_allowed_script_ext(path) {
        return false;
    }
    if rel.starts_with("api/") || rel.starts_with('_') {
        return false;
    }
    true
}

fn is_remix_file(path: &Path, root: &Path) -> bool {
    let rel = path.strip_prefix(root).unwrap_or(path).to_string_lossy().replace('\\', "/");
    if !has_allowed_script_ext(path) || rel.contains(".server.") {
        return false;
    }
    !rel.split('/').any(|segment| segment.starts_with("__"))
}

fn walk_files(root: &Path, limit: usize, matcher: &dyn Fn(&Path) -> bool) -> Vec<PathBuf> {
    if !root.exists() {
        return vec![];
    }
    let mut files: Vec<PathBuf> = Vec::new();
    for entry in WalkDir::new(root).follow_links(false).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        if matcher(path) {
            files.push(path.to_path_buf());
            if files.len() >= limit {
                break;
            }
        }
    }
    files
}

fn format_next_app_route(root: &Path, file: &Path) -> String {
    let rel = file.strip_prefix(root).unwrap_or(file).to_string_lossy().replace('\\', "/");
    let without_page = if rel == "page.tsx" || rel == "page.ts" || rel == "page.jsx" || rel == "page.js" {
        ""
    } else {
        rel
        .trim_end_matches("/page.tsx")
        .trim_end_matches("/page.ts")
        .trim_end_matches("/page.jsx")
        .trim_end_matches("/page.js")
    }
        .trim_start_matches('/');
    let cleaned = without_page
        .split('/')
        .filter(|segment| !segment.is_empty())
        .filter(|segment| !(segment.starts_with('(') && segment.ends_with(')')))
        .collect::<Vec<_>>()
        .join("/");
    normalize_route(&cleaned)
}

fn format_next_pages_route(root: &Path, file: &Path) -> String {
    let rel = file.strip_prefix(root).unwrap_or(file).to_string_lossy().replace('\\', "/");
    let mut clean = rel
        .trim_end_matches(".tsx")
        .trim_end_matches(".ts")
        .trim_end_matches(".jsx")
        .trim_end_matches(".js")
        .to_string();
    if clean == "index" {
        return "/".to_string();
    }
    if clean.ends_with("/index") {
        clean = clean[..clean.len() - 6].to_string();
    }
    normalize_route(&clean)
}

fn format_remix_route(root: &Path, file: &Path) -> String {
    let rel = file.strip_prefix(root).unwrap_or(file).to_string_lossy().replace('\\', "/");
    let clean = rel
        .trim_end_matches(".tsx")
        .trim_end_matches(".ts")
        .trim_end_matches(".jsx")
        .trim_end_matches(".js")
        .to_string();
    let mut parts: Vec<String> = Vec::new();
    for token in clean.split('/').flat_map(|segment| segment.split('.')) {
        let normalized = token.trim();
        if normalized.is_empty() || normalized == "index" || normalized == "_index" {
            continue;
        }
        if normalized == "$" {
            parts.push(":param".to_string());
        } else if normalized.starts_with('$') {
            parts.push(format!(":{}", normalized.trim_start_matches('$')));
        } else {
            parts.push(normalized.trim_start_matches('_').to_string());
        }
    }
    if parts.is_empty() {
        "/".to_string()
    } else {
        normalize_route(&parts.join("/"))
    }
}

fn format_static_html_route(root: &Path, file: &Path) -> String {
    let rel = file.strip_prefix(root).unwrap_or(file).to_string_lossy().replace('\\', "/");
    let mut clean = rel.trim_end_matches(".html").to_string();
    if clean.ends_with("/index") {
        clean = clean[..clean.len() - 6].to_string();
    }
    normalize_route(&clean)
}

fn push_unique_route(routes: &mut Vec<RouteEntry>, seen: &mut HashSet<String>, path: String, source: &str, limit: usize) {
    if routes.len() < limit && seen.insert(path.clone()) {
        routes.push(RouteEntry { label: build_label(&path), path, source: source.to_string() });
    }
}

fn detect_next_app(project_root: &Path, limit: usize) -> Vec<RouteEntry> {
    let mut routes = Vec::new();
    let mut seen = HashSet::new();
    for root in vec![project_root.join("app"), project_root.join("src").join("app")] {
        if !root.exists() { continue; }
        for file in walk_files(&root, limit, &|path| is_next_app_page(path)) {
            let path = format_next_app_route(&root, &file);
            push_unique_route(&mut routes, &mut seen, path, "next-app", limit);
        }
    }
    routes
}

fn detect_next_pages(project_root: &Path, limit: usize) -> Vec<RouteEntry> {
    let mut routes = Vec::new();
    let mut seen = HashSet::new();
    for root in vec![project_root.join("pages"), project_root.join("src").join("pages")] {
        if !root.exists() { continue; }
        for file in walk_files(&root, limit, &|path| is_next_pages_file(path, &root)) {
            let path = format_next_pages_route(&root, &file);
            push_unique_route(&mut routes, &mut seen, path, "next-pages", limit);
        }
    }
    routes
}

fn detect_remix(project_root: &Path, limit: usize) -> Vec<RouteEntry> {
    let root = project_root.join("app").join("routes");
    let mut routes = Vec::new();
    let mut seen = HashSet::new();
    if !root.exists() { return routes; }
    for file in walk_files(&root, limit, &|path| is_remix_file(path, &root)) {
        let path = format_remix_route(&root, &file);
        push_unique_route(&mut routes, &mut seen, path, "remix-routes", limit);
    }
    routes
}

fn detect_static_html(project_root: &Path, limit: usize) -> Vec<RouteEntry> {
    let mut routes = Vec::new();
    let mut seen = HashSet::new();
    for root in vec![project_root.join("dist"), project_root.join("build"), project_root.join("out"), project_root.join("public"), project_root.join("src")] {
        if !root.exists() { continue; }
        for file in walk_files(&root, limit, &|path| path.to_string_lossy().to_lowercase().ends_with(".html")) {
            let path = format_static_html_route(&root, &file);
            if path == "/404" || path == "/500" || path == "/_error" { continue; }
            push_unique_route(&mut routes, &mut seen, path, "static-html", limit);
        }
    }
    routes
}

fn detect_spa(project_root: &Path, limit: usize) -> Vec<RouteEntry> {
    let mut routes = Vec::new();
    let mut seen = HashSet::new();
    push_unique_route(&mut routes, &mut seen, "/".to_string(), "spa-html", limit);
    let candidates = vec![project_root.join("index.html"), project_root.join("build").join("index.html"), project_root.join("dist").join("index.html")];
    let href_re = Regex::new(r#"href=["'](/[^"']*)["']"#).unwrap();
    let route_re = Regex::new(r#"data-route=["'](/[^"']*)["']"#).unwrap();
    for file in candidates {
        if let Ok(content) = fs::read_to_string(file) {
            for cap in href_re.captures_iter(&content) {
                if let Some(raw) = cap.get(1) { push_unique_route(&mut routes, &mut seen, normalize_route(raw.as_str()), "spa-html", limit); }
            }
            for cap in route_re.captures_iter(&content) {
                if let Some(raw) = cap.get(1) { push_unique_route(&mut routes, &mut seen, normalize_route(raw.as_str()), "spa-html", limit); }
            }
            break;
        }
    }
    routes
}

fn resolve_detector(project_root: &Path, preferred: &str) -> String {
    if preferred != "auto" { return preferred.to_string(); }
    if project_root.join("app").join("routes").exists() { return "remix-routes".to_string(); }
    if project_root.join("app").exists() || project_root.join("src").join("app").exists() { return "next-app".to_string(); }
    if project_root.join("pages").exists() || project_root.join("src").join("pages").exists() { return "next-pages".to_string(); }
    if project_root.join("build").join("index.html").exists() || project_root.join("dist").join("index.html").exists() { return "spa-html".to_string(); }
    "static-html".to_string()
}

fn run_discover_scan(project_root: &str, limit: usize, preferred: &str, out_path: &str) -> Result<(), String> {
    let started = Instant::now();
    let root = Path::new(project_root);
    let detector_id = resolve_detector(root, preferred);
    let routes = match detector_id.as_str() {
        "next-app" => detect_next_app(root, limit),
        "next-pages" | "nuxt-pages" => detect_next_pages(root, limit),
        "remix-routes" => detect_remix(root, limit),
        "spa-html" => detect_spa(root, limit),
        _ => detect_static_html(root, limit),
    };
    let output = DiscoverScanOutput {
        status: "ok".to_string(),
        detector_id,
        route_count: routes.len(),
        routes,
        elapsed_ms: started.elapsed().as_millis(),
        message: None,
    };
    write_json_file(out_path, &output)
}

fn read_top_issues_from_summary(summary_path: &str) -> Result<Vec<TopIssue>, String> {
    let raw = fs::read_to_string(summary_path).map_err(|err| format!("failed to read summary '{}': {}", summary_path, err))?;
    let value: Value = serde_json::from_str(&raw).map_err(|err| format!("failed to parse summary '{}': {}", summary_path, err))?;
    let results = value.get("results").and_then(|v| v.as_array()).ok_or_else(|| "summary missing results array".to_string())?;
    let mut map: HashMap<String, (String, usize, f64)> = HashMap::new();

    for result in results {
        let Some(opportunities) = result.get("opportunities").and_then(|v| v.as_array()) else { continue; };
        for item in opportunities {
            let id = item.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
            let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("Unknown issue").to_string();
            let savings = item.get("estimatedSavingsMs").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let entry = map.entry(id.to_string()).or_insert((title, 0, 0.0));
            entry.1 += 1;
            entry.2 += savings;
        }
    }

    let mut issues: Vec<TopIssue> = map
        .into_iter()
        .map(|(id, (title, count, total_ms))| TopIssue { id, title, count, total_ms: total_ms.round() as i64 })
        .collect();
    issues.sort_by(|a, b| b.total_ms.cmp(&a.total_ms).then(b.count.cmp(&a.count)));
    issues.truncate(20);
    Ok(issues)
}

fn run_process_summary(summary_path: &str, out_path: &str) -> Result<(), String> {
    let started = Instant::now();
    let issues = read_top_issues_from_summary(summary_path)?;
    let output = ProcessSummaryOutput {
        status: "ok".to_string(),
        top_issues: issues,
        elapsed_ms: started.elapsed().as_millis(),
        message: None,
    };
    write_json_file(out_path, &output)
}

fn task_string(task: &Value, key: &str, fallback: &str) -> String {
    task.get(key).and_then(|v| v.as_str()).unwrap_or(fallback).to_string()
}

fn task_headers(task: &Value) -> Vec<String> {
    task.get("requiredHeaders")
        .and_then(|v| v.as_array())
        .map(|values| values.iter().filter_map(|v| v.as_str()).map(|s| s.to_lowercase()).collect())
        .unwrap_or_default()
}

fn retry_settings(policy: &str) -> (usize, u64) {
    match policy {
        "off" => (1, 0),
        "aggressive" => (3, 300),
        _ => (2, 150),
    }
}

fn perform_http_get(url: &str, user_agent: &str, timeout_ms: u64) -> Result<(u16, HashMap<String, String>, Vec<u8>, u128), String> {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_millis(timeout_ms))
        .timeout_read(Duration::from_millis(timeout_ms))
        .timeout_write(Duration::from_millis(timeout_ms))
        .build();

    let started = Instant::now();
    let response_result = agent.get(url).set("user-agent", user_agent).call();
    let elapsed_ms = started.elapsed().as_millis();

    let mut headers: HashMap<String, String> = HashMap::new();
    let mut body: Vec<u8> = Vec::new();
    match response_result {
        Ok(response) => {
            for name in response.headers_names() {
                if let Some(value) = response.header(&name) {
                    headers.insert(name.to_lowercase(), value.to_string());
                }
            }
            let status = response.status() as u16;
            let mut reader = response.into_reader();
            reader.read_to_end(&mut body).map_err(|err| format!("failed reading body for '{}': {}", url, err))?;
            Ok((status, headers, body, elapsed_ms))
        }
        Err(ureq::Error::Status(code, response)) => {
            for name in response.headers_names() {
                if let Some(value) = response.header(&name) {
                    headers.insert(name.to_lowercase(), value.to_string());
                }
            }
            let mut reader = response.into_reader();
            reader.read_to_end(&mut body).map_err(|err| format!("failed reading body for '{}': {}", url, err))?;
            Ok((code as u16, headers, body, elapsed_ms))
        }
        Err(ureq::Error::Transport(err)) => Err(err.to_string()),
    }
}

fn run_network_task_once(mode: &str, task: &Value, timeout_ms: u64) -> Result<Value, String> {
    match mode {
        "health" => {
            let label = task_string(task, "label", "target");
            let path = task_string(task, "path", "/");
            let url = task_string(task, "url", "");
            let (status_code, _headers, body, elapsed_ms) = perform_http_get(&url, "signaler/rust-health", timeout_ms)?;
            Ok(json!({ "label": label, "path": path, "url": url, "statusCode": status_code, "ttfbMs": elapsed_ms, "totalMs": elapsed_ms, "bytes": body.len() }))
        }
        "headers" => {
            let label = task_string(task, "label", "target");
            let path = task_string(task, "path", "/");
            let url = task_string(task, "url", "");
            let required = task_headers(task);
            let (status_code, headers, _body, _elapsed) = perform_http_get(&url, "signaler/rust-headers", timeout_ms)?;
            let mut present: Vec<String> = Vec::new();
            let mut missing: Vec<String> = Vec::new();
            for key in required {
                if headers.get(&key).map(|v| !v.trim().is_empty()).unwrap_or(false) { present.push(key); } else { missing.push(key); }
            }
            Ok(json!({ "label": label, "path": path, "url": url, "statusCode": status_code, "present": present, "missing": missing }))
        }
        "links" => {
            let url = task_string(task, "url", "");
            let (status_code, _headers, body, _elapsed) = perform_http_get(&url, "signaler/rust-links", timeout_ms)?;
            Ok(json!({ "url": url, "statusCode": status_code, "bytes": body.len() }))
        }
        _ => Err(format!("unsupported net-worker mode: {}", mode)),
    }
}

fn runtime_error_result(mode: &str, task: &Value, message: &str) -> Value {
    match mode {
        "health" => json!({ "label": task_string(task, "label", "target"), "path": task_string(task, "path", "/"), "url": task_string(task, "url", ""), "runtimeErrorMessage": message }),
        "headers" => json!({ "label": task_string(task, "label", "target"), "path": task_string(task, "path", "/"), "url": task_string(task, "url", ""), "present": Vec::<String>::new(), "missing": task_headers(task), "runtimeErrorMessage": message }),
        _ => json!({ "url": task_string(task, "url", ""), "runtimeErrorMessage": message }),
    }
}

fn run_task_with_retry(mode: &str, task: &Value, timeout_ms: u64, retry_policy: &str, stats: &Arc<Mutex<NetWorkerStats>>) -> Value {
    let (max_attempts, cooldown_ms) = retry_settings(retry_policy);
    for attempt in 0..max_attempts {
        match run_network_task_once(mode, task, timeout_ms) {
            Ok(value) => return value,
            Err(error) => {
                if attempt + 1 < max_attempts {
                    if let Ok(mut guard) = stats.lock() {
                        guard.retries += 1;
                        if cooldown_ms > 0 { guard.cooldown_pauses += 1; }
                    }
                    if cooldown_ms > 0 { thread::sleep(Duration::from_millis(cooldown_ms)); }
                    continue;
                }
                return runtime_error_result(mode, task, &error);
            }
        }
    }
    runtime_error_result(mode, task, "unexpected retry state")
}

fn run_net_worker(mode: &str, input_path: &str, out_path: &str) -> Result<(), String> {
    let started = Instant::now();
    let raw = fs::read_to_string(input_path).map_err(|err| format!("failed to read network input '{}': {}", input_path, err))?;
    let input: NetWorkerInput = serde_json::from_str(&raw).map_err(|err| format!("failed to parse network input '{}': {}", input_path, err))?;

    if input.schema_version != 1 { return Err(format!("unsupported net-worker schemaVersion: {}", input.schema_version)); }
    if input.mode != mode { return Err(format!("mode mismatch: --mode={} but payload.mode={}", mode, input.mode)); }
    if mode == "console" { return Err("console mode is not supported by Rust net-worker yet; falling back to Node is required".to_string()); }
    if mode != "health" && mode != "headers" && mode != "links" { return Err(format!("unsupported net-worker mode: {}", mode)); }

    let mut used_fallback_safe_defaults = false;
    let task_count = input.tasks.len();
    let mut resolved_parallel = if input.parallel == 0 { used_fallback_safe_defaults = true; 1usize } else { input.parallel };
    if resolved_parallel > 32 { resolved_parallel = 32; used_fallback_safe_defaults = true; }
    if task_count > 0 && resolved_parallel > task_count { resolved_parallel = task_count; used_fallback_safe_defaults = true; }

    if task_count == 0 {
        let output = NetWorkerOutput { schema_version: 1, status: "ok".to_string(), mode: mode.to_string(), elapsed_ms: started.elapsed().as_millis(), used_fallback_safe_defaults, results: vec![], stats: NetWorkerStats::default(), error_message: None };
        return write_json_file(out_path, &output);
    }

    let queue: Arc<Mutex<VecDeque<(usize, Value)>>> = Arc::new(Mutex::new(input.tasks.into_iter().enumerate().collect()));
    let results: Arc<Mutex<Vec<Option<Value>>>> = Arc::new(Mutex::new(vec![None; task_count]));
    let stats: Arc<Mutex<NetWorkerStats>> = Arc::new(Mutex::new(NetWorkerStats { attempted: task_count, ..NetWorkerStats::default() }));

    let mut workers = Vec::new();
    for _ in 0..resolved_parallel {
        let queue = Arc::clone(&queue);
        let results = Arc::clone(&results);
        let stats = Arc::clone(&stats);
        let mode_owned = mode.to_string();
        let retry_policy = input.retry_policy.clone();
        let timeout_ms = input.timeout_ms;
        workers.push(thread::spawn(move || loop {
            let next = { queue.lock().unwrap().pop_front() };
            let Some((index, task)) = next else { break; };
            let result = run_task_with_retry(&mode_owned, &task, timeout_ms, &retry_policy, &stats);
            results.lock().unwrap()[index] = Some(result);
        }));
    }

    for worker in workers {
        if worker.join().is_err() { return Err("net-worker thread panicked".to_string()); }
    }

    let mut ordered_results: Vec<Value> = Vec::with_capacity(task_count);
    let mut succeeded = 0usize;
    let mut failed = 0usize;
    for maybe in results.lock().unwrap().iter() {
        let result = maybe.clone().unwrap_or_else(|| json!({"runtimeErrorMessage": "missing task result"}));
        let is_error = result.get("runtimeErrorMessage").and_then(|v| v.as_str()).map(|v| !v.is_empty()).unwrap_or(false);
        if is_error { failed += 1; } else { succeeded += 1; }
        ordered_results.push(result);
    }

    if let Ok(mut guard) = stats.lock() {
        guard.succeeded = succeeded;
        guard.failed = failed;
    }
    let final_stats = stats.lock().unwrap().clone();
    let status = if failed == 0 { "ok" } else if succeeded == 0 { "error" } else { "warn" };
    let output = NetWorkerOutput {
        schema_version: 1,
        status: status.to_string(),
        mode: mode.to_string(),
        elapsed_ms: started.elapsed().as_millis(),
        used_fallback_safe_defaults,
        results: ordered_results,
        stats: final_stats,
        error_message: None,
    };
    write_json_file(out_path, &output)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StdioWorkerResponse {
    r#type: String,
    id: String,
    result: Option<Value>,
    error_message: Option<String>,
}

struct StdioWorkerProcess {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

fn spawn_stdio_worker(worker: &RunCoreWorker) -> Result<StdioWorkerProcess, String> {
    let mut command = Command::new(&worker.command);
    for arg in &worker.args {
        command.arg(arg);
    }
    let mut child = command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|err| format!("failed to spawn stdio worker '{}': {}", worker.command, err))?;
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "failed to acquire worker stdin".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "failed to acquire worker stdout".to_string())?;
    Ok(StdioWorkerProcess { child, stdin, stdout: BufReader::new(stdout) })
}

fn send_worker_request(
    process: &mut StdioWorkerProcess,
    request_id: &str,
    task: &RunCoreTask,
) -> Result<StdioWorkerResponse, String> {
    let payload = json!({
        "type": "run",
        "id": request_id,
        "task": task,
    });
    let line = serde_json::to_string(&payload).map_err(|err| format!("failed to serialize worker request: {}", err))?;
    process
        .stdin
        .write_all(format!("{}\n", line).as_bytes())
        .and_then(|_| process.stdin.flush())
        .map_err(|err| format!("failed to write worker request: {}", err))?;

    let mut response_line = String::new();
    let read = process
        .stdout
        .read_line(&mut response_line)
        .map_err(|err| format!("failed to read worker response: {}", err))?;
    if read == 0 {
        return Err("worker closed stdout unexpectedly".to_string());
    }
    serde_json::from_str::<StdioWorkerResponse>(response_line.trim())
        .map_err(|err| format!("failed to parse worker response JSON: {}", err))
}

fn classify_stability(failure_rate: f64, retry_rate: f64, reductions: usize) -> String {
    if failure_rate >= 0.2 || retry_rate >= 0.45 || reductions >= 3 {
        "unstable".to_string()
    } else if failure_rate >= 0.1 || retry_rate >= 0.25 || reductions >= 1 {
        "degraded".to_string()
    } else {
        "stable".to_string()
    }
}

fn reduction_retry_threshold(policy: &str) -> usize {
    if policy == "aggressive" {
        2
    } else if policy == "off" {
        usize::MAX
    } else {
        3
    }
}

fn cooldown_retry_threshold(policy: &str) -> usize {
    if policy == "aggressive" {
        1
    } else if policy == "off" {
        usize::MAX
    } else {
        2
    }
}

fn cooldown_delay_ms(policy: &str, consecutive_retries: usize) -> u64 {
    if policy == "off" {
        return 0;
    }
    let (base, cap): (u64, u64) = if policy == "aggressive" { (2500, 7000) } else { (1500, 5000) };
    let multiplier: u64 = std::cmp::max(1, std::cmp::min(4, consecutive_retries as u64));
    std::cmp::min(cap, base * multiplier)
}

fn failure_summary(task: &RunCoreTask, message: &str) -> Value {
    json!({
        "url": task.url,
        "path": task.path,
        "label": task.label,
        "device": task.device,
        "pageScope": task.page_scope,
        "scores": {},
        "metrics": {},
        "opportunities": [],
        "failedAudits": [],
        "runtimeErrorMessage": message,
    })
}

fn run_core(input_path: &str, out_path: &str) -> Result<(), String> {
    let started = Instant::now();
    let raw = fs::read_to_string(input_path).map_err(|err| format!("failed to read run-core input '{}': {}", input_path, err))?;
    let input: RunCoreInput = serde_json::from_str(&raw).map_err(|err| format!("failed to parse run-core input '{}': {}", input_path, err))?;
    if input.schema_version != 1 {
        return Err(format!("unsupported run-core schemaVersion: {}", input.schema_version));
    }

    let warmup_started = Instant::now();
    let warmup_ms = if input.warm_up.enabled { warmup_started.elapsed().as_millis() } else { 0 };

    let queue_started = Instant::now();
    let queue: VecDeque<(usize, RunCoreTask, usize)> = input
        .tasks
        .iter()
        .enumerate()
        .map(|(index, task)| (index, task.clone(), 0usize))
        .collect();
    let queue_build_ms = queue_started.elapsed().as_millis();

    if queue.is_empty() {
        let output = RunCoreOutput {
            schema_version: 1,
            status: "ok".to_string(),
            results: vec![],
            runner_stability: RunCoreRunnerStability {
                backoff_policy: input.throughput_backoff,
                initial_parallel: 0,
                final_parallel: 0,
                total_attempts: 0,
                total_failures: 0,
                total_retries: 0,
                reductions: 0,
                cooldown_pauses: 0,
                failure_rate: 0.0,
                retry_rate: 0.0,
                max_consecutive_retries: 0,
                cooldown_ms_total: 0,
                recovery_increases: 0,
                status: "stable".to_string(),
            },
            execution: RunCoreExecution {
                elapsed_ms: started.elapsed().as_millis(),
                attempted_tasks: 0,
                completed_tasks: 0,
                step_timings: RunCoreStepTimings {
                    warm_up_ms: warmup_ms,
                    queue_build_ms,
                    run_loop_ms: 0,
                    reduction_ms: 0,
                    total_ms: started.elapsed().as_millis(),
                },
            },
            fallback_safe_defaults_used: false,
            error_message: None,
        };
        return write_json_file(out_path, &output);
    }

    let mut used_fallback_safe_defaults = false;
    let mut resolved_parallel = if input.parallel == 0 {
        used_fallback_safe_defaults = true;
        1usize
    } else {
        input.parallel
    };
    if resolved_parallel > queue.len() {
        resolved_parallel = queue.len();
        used_fallback_safe_defaults = true;
    }
    if resolved_parallel > 12 {
        resolved_parallel = 12;
        used_fallback_safe_defaults = true;
    }

    let initial_parallel = resolved_parallel;
    let active_parallel = Arc::new(AtomicUsize::new(resolved_parallel));
    let queue_shared: Arc<Mutex<VecDeque<(usize, RunCoreTask, usize)>>> = Arc::new(Mutex::new(queue));
    let results: Arc<Mutex<Vec<Option<Value>>>> = Arc::new(Mutex::new(vec![None; input.tasks.len()]));

    let total_attempts = Arc::new(AtomicUsize::new(0));
    let total_failures = Arc::new(AtomicUsize::new(0));
    let total_retries = Arc::new(AtomicUsize::new(0));
    let reductions = Arc::new(AtomicUsize::new(0));
    let cooldown_pauses = Arc::new(AtomicUsize::new(0));
    let max_consecutive_retries = Arc::new(AtomicUsize::new(0));
    let cooldown_ms_total = Arc::new(AtomicUsize::new(0));
    let consecutive_retries = Arc::new(AtomicUsize::new(0));
    let completed_tasks = Arc::new(AtomicUsize::new(0));
    let max_attempts = 5usize;

    let run_started = Instant::now();
    let mut workers = Vec::new();
    for worker_index in 0..initial_parallel {
        let queue_ref = Arc::clone(&queue_shared);
        let results_ref = Arc::clone(&results);
        let active_ref = Arc::clone(&active_parallel);
        let attempts_ref = Arc::clone(&total_attempts);
        let failures_ref = Arc::clone(&total_failures);
        let retries_ref = Arc::clone(&total_retries);
        let reductions_ref = Arc::clone(&reductions);
        let cooldown_ref = Arc::clone(&cooldown_pauses);
        let cooldown_total_ref = Arc::clone(&cooldown_ms_total);
        let consecutive_ref = Arc::clone(&consecutive_retries);
        let max_consecutive_ref = Arc::clone(&max_consecutive_retries);
        let completed_ref = Arc::clone(&completed_tasks);
        let worker_def = input.worker.clone();
        let backoff_policy = input.throughput_backoff.clone();
        workers.push(thread::spawn(move || -> Result<(), String> {
            let mut process = spawn_stdio_worker(&worker_def)?;
            loop {
                let current_limit = active_ref.load(Ordering::Relaxed);
                if worker_index >= current_limit {
                    thread::sleep(Duration::from_millis(50));
                    continue;
                }

                let next = {
                    let mut guard = queue_ref.lock().map_err(|_| "failed to lock queue".to_string())?;
                    guard.pop_front()
                };

                let Some((task_index, task, attempts)) = next else {
                    break;
                };

                attempts_ref.fetch_add(1, Ordering::Relaxed);
                let request_id = format!("{}-{}-{}", worker_index, task_index, attempts + 1);
                match send_worker_request(&mut process, &request_id, &task) {
                    Ok(response) => {
                        if response.r#type == "result" && response.id == request_id {
                            let mut guard = results_ref.lock().map_err(|_| "failed to lock results".to_string())?;
                            guard[task_index] = response.result;
                            completed_ref.fetch_add(1, Ordering::Relaxed);
                            consecutive_ref.store(0, Ordering::Relaxed);
                        } else {
                            failures_ref.fetch_add(1, Ordering::Relaxed);
                            let retry_attempts = attempts + 1;
                            if retry_attempts < max_attempts {
                                retries_ref.fetch_add(1, Ordering::Relaxed);
                                let mut guard = queue_ref.lock().map_err(|_| "failed to lock queue".to_string())?;
                                guard.push_back((task_index, task.clone(), retry_attempts));
                            } else {
                                let mut guard = results_ref.lock().map_err(|_| "failed to lock results".to_string())?;
                                guard[task_index] = Some(failure_summary(&task, response.error_message.as_deref().unwrap_or("worker returned non-result response")));
                                completed_ref.fetch_add(1, Ordering::Relaxed);
                            }
                            let consecutive = consecutive_ref.fetch_add(1, Ordering::Relaxed) + 1;
                            let prev_max = max_consecutive_ref.load(Ordering::Relaxed);
                            if consecutive > prev_max {
                                max_consecutive_ref.store(consecutive, Ordering::Relaxed);
                            }
                        }
                    }
                    Err(err) => {
                        failures_ref.fetch_add(1, Ordering::Relaxed);
                        let retry_attempts = attempts + 1;
                        if retry_attempts < max_attempts {
                            retries_ref.fetch_add(1, Ordering::Relaxed);
                            let mut guard = queue_ref.lock().map_err(|_| "failed to lock queue".to_string())?;
                            guard.push_back((task_index, task.clone(), retry_attempts));
                        } else {
                            let mut guard = results_ref.lock().map_err(|_| "failed to lock results".to_string())?;
                            guard[task_index] = Some(failure_summary(&task, &err));
                            completed_ref.fetch_add(1, Ordering::Relaxed);
                        }
                        process = spawn_stdio_worker(&worker_def)?;
                        let consecutive = consecutive_ref.fetch_add(1, Ordering::Relaxed) + 1;
                        let prev_max = max_consecutive_ref.load(Ordering::Relaxed);
                        if consecutive > prev_max {
                            max_consecutive_ref.store(consecutive, Ordering::Relaxed);
                        }
                    }
                }

                let current_consecutive = consecutive_ref.load(Ordering::Relaxed);
                let reduction_threshold = reduction_retry_threshold(&backoff_policy);
                if current_consecutive >= reduction_threshold {
                    let current_active = active_ref.load(Ordering::Relaxed);
                    if current_active > 1 {
                        let new_active = std::cmp::max(1, current_active / 2);
                        if new_active < current_active {
                            active_ref.store(new_active, Ordering::Relaxed);
                            reductions_ref.fetch_add(1, Ordering::Relaxed);
                        }
                    }
                }
                let cooldown_threshold = cooldown_retry_threshold(&backoff_policy);
                if current_consecutive >= cooldown_threshold {
                    let delay_ms = cooldown_delay_ms(&backoff_policy, current_consecutive);
                    if delay_ms > 0 {
                        cooldown_ref.fetch_add(1, Ordering::Relaxed);
                        cooldown_total_ref.fetch_add(delay_ms as usize, Ordering::Relaxed);
                        thread::sleep(Duration::from_millis(delay_ms));
                    }
                    consecutive_ref.store(0, Ordering::Relaxed);
                }
            }

            let _ = process.stdin.write_all(b"{\"type\":\"shutdown\"}\n");
            let _ = process.child.kill();
            Ok(())
        }));
    }

    let mut worker_error: Option<String> = None;
    for handle in workers {
        match handle.join() {
            Ok(Ok(())) => {}
            Ok(Err(err)) => {
                worker_error = Some(err);
            }
            Err(_) => {
                worker_error = Some("run-core worker thread panicked".to_string());
            }
        }
    }
    let run_loop_ms = run_started.elapsed().as_millis();

    let reduce_started = Instant::now();
    let resolved_results: Vec<Value> = {
        let guard = results.lock().map_err(|_| "failed to lock final results".to_string())?;
        let mut out = Vec::with_capacity(guard.len());
        for (idx, maybe) in guard.iter().enumerate() {
            if let Some(value) = maybe {
                out.push(value.clone());
            } else {
                out.push(failure_summary(&input.tasks[idx], "missing result"));
            }
        }
        out
    };
    let reduction_ms = reduce_started.elapsed().as_millis();

    let attempts = total_attempts.load(Ordering::Relaxed);
    let failures = total_failures.load(Ordering::Relaxed);
    let retries = total_retries.load(Ordering::Relaxed);
    let failure_rate = if attempts > 0 { failures as f64 / attempts as f64 } else { 0.0 };
    let retry_rate = if attempts > 0 { retries as f64 / attempts as f64 } else { 0.0 };
    let reductions_count = reductions.load(Ordering::Relaxed);
    let cooldowns = cooldown_pauses.load(Ordering::Relaxed);
    let max_retries_consecutive = max_consecutive_retries.load(Ordering::Relaxed);
    let cooldown_total = cooldown_ms_total.load(Ordering::Relaxed) as u128;
    let completed = completed_tasks.load(Ordering::Relaxed);

    let output = RunCoreOutput {
        schema_version: 1,
        status: if completed == 0 { "error".to_string() } else if failures > 0 { "warn".to_string() } else { "ok".to_string() },
        results: resolved_results,
        runner_stability: RunCoreRunnerStability {
            backoff_policy: input.throughput_backoff.clone(),
            initial_parallel,
            final_parallel: active_parallel.load(Ordering::Relaxed),
            total_attempts: attempts,
            total_failures: failures,
            total_retries: retries,
            reductions: reductions_count,
            cooldown_pauses: cooldowns,
            failure_rate,
            retry_rate,
            max_consecutive_retries: max_retries_consecutive,
            cooldown_ms_total: cooldown_total,
            recovery_increases: 0,
            status: classify_stability(failure_rate, retry_rate, reductions_count),
        },
        execution: RunCoreExecution {
            elapsed_ms: started.elapsed().as_millis(),
            attempted_tasks: input.tasks.len(),
            completed_tasks: completed,
            step_timings: RunCoreStepTimings {
                warm_up_ms: warmup_ms,
                queue_build_ms,
                run_loop_ms,
                reduction_ms,
                total_ms: started.elapsed().as_millis(),
            },
        },
        fallback_safe_defaults_used: used_fallback_safe_defaults,
        error_message: worker_error,
    };
    write_json_file(out_path, &output)
}

fn confidence_for_issue(total_ms: i64, count: usize) -> &'static str {
    if total_ms > 0 && count >= 3 {
        "high"
    } else if total_ms > 0 || count >= 2 {
        "medium"
    } else {
        "low"
    }
}

fn action_for_issue(issue_id: &str) -> (String, Vec<String>, String) {
    if issue_id == "redirects" {
        return (
            "Eliminate redirect chains on high-traffic routes.".to_string(),
            vec![
                "Check middleware and route config for chained redirects.".to_string(),
                "Normalize canonical/trailing slash rules.".to_string(),
                "Re-run in fidelity mode on affected routes.".to_string(),
            ],
            "medium".to_string(),
        );
    }
    if issue_id == "unused-javascript" {
        return (
            "Reduce unused JavaScript with route-level code splitting.".to_string(),
            vec![
                "Identify largest wasted bundles from diagnostics artifacts.".to_string(),
                "Apply dynamic imports to route-specific modules.".to_string(),
                "Verify TBT/LCP improvements in throughput mode.".to_string(),
            ],
            "medium".to_string(),
        );
    }
    if issue_id == "unused-css-rules" || issue_id == "unminified-css" {
        return (
            "Reduce CSS payload and enforce minification.".to_string(),
            vec![
                "Enable or validate CSS minification in build pipeline.".to_string(),
                "Remove unused styles with tooling or manual pruning.".to_string(),
                "Verify bytes and render metrics after rerun.".to_string(),
            ],
            "low".to_string(),
        );
    }
    (
        "Investigate and address this issue with targeted fixes.".to_string(),
        vec![
            "Inspect linked evidence pointers.".to_string(),
            "Apply fix on highest-impact routes first.".to_string(),
            "Re-run and compare against baseline.".to_string(),
        ],
        "medium".to_string(),
    )
}

fn run_reduce_signals(input_path: &str, out_path: &str) -> Result<(), String> {
    let started = Instant::now();
    let raw = fs::read_to_string(input_path).map_err(|err| format!("failed to read reduce-signals input '{}': {}", input_path, err))?;
    let input: ReduceSignalsInput = serde_json::from_str(&raw).map_err(|err| format!("failed to parse reduce-signals input '{}': {}", input_path, err))?;
    if input.schema_version != 1 {
        return Err(format!("unsupported reduce-signals schemaVersion: {}", input.schema_version));
    }

    let summary_raw = fs::read_to_string(&input.summary_path)
        .map_err(|err| format!("failed to read summary '{}': {}", input.summary_path, err))?;
    let summary_value: Value = serde_json::from_str(&summary_raw)
        .map_err(|err| format!("failed to parse summary '{}': {}", input.summary_path, err))?;
    let results = summary_value
        .get("results")
        .and_then(|v| v.as_array())
        .ok_or_else(|| "summary missing results array".to_string())?;

    let mut issue_map: HashMap<String, (String, usize, f64)> = HashMap::new();
    let mut bytes_by_issue: HashMap<String, f64> = HashMap::new();
    for result in results {
        let opportunities_opt = result.get("opportunities").and_then(|v| v.as_array());
        let opportunities: &[Value] = match opportunities_opt {
            Some(values) => values.as_slice(),
            None => &[],
        };
        for item in opportunities {
            let id = item.get("id").and_then(|v| v.as_str()).unwrap_or("unknown");
            let title = item.get("title").and_then(|v| v.as_str()).unwrap_or("Unknown issue").to_string();
            let savings_ms = item.get("estimatedSavingsMs").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let savings_bytes = item.get("estimatedSavingsBytes").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let entry = issue_map.entry(id.to_string()).or_insert((title, 0, 0.0));
            entry.1 += 1;
            entry.2 += savings_ms;
            let bytes_entry = bytes_by_issue.entry(id.to_string()).or_insert(0.0);
            *bytes_entry += savings_bytes.max(0.0);
        }
    }

    let mut top_issues: Vec<ReduceIssue> = issue_map
        .iter()
        .map(|(id, (title, count, total_ms))| ReduceIssue {
            id: id.clone(),
            title: title.clone(),
            count: *count,
            total_ms: total_ms.round() as i64,
        })
        .collect();
    top_issues.sort_by(|a, b| b.total_ms.cmp(&a.total_ms).then(b.count.cmp(&a.count)));
    top_issues.truncate(20);

    let min_confidence_rank = match input.policy.min_confidence.as_str() {
        "high" => 3,
        "medium" => 2,
        _ => 1,
    };

    let mut suggestions: Vec<Value> = Vec::new();
    for (index, issue) in top_issues.iter().enumerate() {
        let estimated_bytes = bytes_by_issue.get(&issue.id).copied().unwrap_or(0.0);
        let estimated_ms = issue.total_ms as f64;
        if input.policy.zero_impact_filter && estimated_ms <= 0.0 && estimated_bytes <= 0.0 {
            continue;
        }
        let confidence = confidence_for_issue(issue.total_ms, issue.count);
        let confidence_rank = match confidence {
            "high" => 3,
            "medium" => 2,
            _ => 1,
        };
        if confidence_rank < min_confidence_rank {
            continue;
        }
        let priority_score = ((issue.total_ms as f64) + estimated_bytes / 1024.0 + issue.count as f64 * 80.0).round() as i64;
        let (summary, steps, effort) = action_for_issue(&issue.id);
        suggestions.push(json!({
            "id": format!("sugg-{}-{}", issue.id, index + 1),
            "title": issue.title,
            "category": "performance",
            "priorityScore": priority_score,
            "confidence": confidence,
            "estimatedImpact": {
                "timeMs": issue.total_ms,
                "bytes": estimated_bytes.round() as i64,
                "affectedCombos": issue.count,
            },
            "evidence": [
                {
                    "sourceRelPath": "issues.json",
                    "pointer": format!("/topIssues/{}", index),
                    "artifactRelPath": "issues.json"
                }
            ],
            "action": {
                "summary": summary,
                "steps": steps,
                "effort": effort
            },
            "modeApplicability": ["fidelity", "throughput"]
        }));
    }

    suggestions.sort_by(|a, b| {
        let pa = a.get("priorityScore").and_then(|v| v.as_i64()).unwrap_or(0);
        let pb = b.get("priorityScore").and_then(|v| v.as_i64()).unwrap_or(0);
        pb.cmp(&pa)
    });
    let max_suggestions = std::cmp::max(1, input.policy.max_suggestions);
    suggestions.truncate(max_suggestions);

    let output = ReduceSignalsOutput {
        schema_version: 1,
        status: "ok".to_string(),
        top_issues: top_issues,
        suggestions: suggestions.clone(),
        stats: ReduceSignalsStats {
            elapsed_ms: started.elapsed().as_millis(),
            issue_count: issue_map.len(),
            suggestion_count: suggestions.len(),
        },
        error_message: None,
    };
    write_json_file(out_path, &output)
}

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.is_empty() {
        usage();
        return ExitCode::from(2);
    }

    let command = args[0].as_str();
    let result = match command {
        "discover-scan" => {
            let project_root = match parse_flag(&args, "--project-root") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --project-root");
                    usage();
                    return ExitCode::from(2);
                }
            };
            let limit = parse_flag(&args, "--limit")
                .and_then(|value| value.parse::<usize>().ok())
                .unwrap_or(200);
            let preferred = parse_flag(&args, "--preferred-detector").unwrap_or_else(|| "auto".to_string());
            let out = match parse_flag(&args, "--out") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --out");
                    usage();
                    return ExitCode::from(2);
                }
            };
            run_discover_scan(&project_root, limit.max(1), &preferred, &out)
        }
        "process-summary" => {
            let summary = match parse_flag(&args, "--summary") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --summary");
                    usage();
                    return ExitCode::from(2);
                }
            };
            let out = match parse_flag(&args, "--out") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --out");
                    usage();
                    return ExitCode::from(2);
                }
            };
            run_process_summary(&summary, &out)
        }
        "net-worker" => {
            let mode = match parse_flag(&args, "--mode") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --mode");
                    usage();
                    return ExitCode::from(2);
                }
            };
            let input_path = match parse_flag(&args, "--in") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --in");
                    usage();
                    return ExitCode::from(2);
                }
            };
            let out = match parse_flag(&args, "--out") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --out");
                    usage();
                    return ExitCode::from(2);
                }
            };
            run_net_worker(&mode, &input_path, &out)
        }
        "run-core" => {
            let input_path = match parse_flag(&args, "--in") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --in");
                    usage();
                    return ExitCode::from(2);
                }
            };
            let out = match parse_flag(&args, "--out") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --out");
                    usage();
                    return ExitCode::from(2);
                }
            };
            run_core(&input_path, &out)
        }
        "reduce-signals" => {
            let input_path = match parse_flag(&args, "--in") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --in");
                    usage();
                    return ExitCode::from(2);
                }
            };
            let out = match parse_flag(&args, "--out") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --out");
                    usage();
                    return ExitCode::from(2);
                }
            };
            run_reduce_signals(&input_path, &out)
        }
        "normalize-benchmark" | "normalize-benchmark-signals" => {
            let input_path = match parse_flag(&args, "--in") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --in");
                    usage();
                    return ExitCode::from(2);
                }
            };
            let out = match parse_flag(&args, "--out") {
                Some(value) => value,
                None => {
                    eprintln!("missing required --out");
                    usage();
                    return ExitCode::from(2);
                }
            };
            run_normalize_benchmark_signals(&input_path, &out)
        }
        _ => {
            usage();
            return ExitCode::from(2);
        }
    };

    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("{}", message);
            ExitCode::from(1)
        }
    }
}

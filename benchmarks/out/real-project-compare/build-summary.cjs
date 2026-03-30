const fs = require('fs');
const path = require('path');
const dir = 'benchmarks/out/real-project-compare';
const cmds = ['health', 'headers', 'links', 'console'];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function metrics(cmd, obj) {
  const m = obj.meta || {};
  const acc = m.accelerator || {};
  let task = 0;
  let err = 0;
  if (cmd === 'links') {
    task = (obj.discovered && obj.discovered.total) || 0;
    err = (obj.broken || []).length;
  } else if (cmd === 'console') {
    task = m.comboCount || 0;
    err = (obj.results || []).filter((r) => r.status === 'error' || r.runtimeErrorMessage).length;
  } else if (cmd === 'headers') {
    task = m.comboCount || 0;
    err = (obj.results || []).filter((r) => r.runtimeErrorMessage || (Array.isArray(r.missing) && r.missing.length > 0)).length;
  } else {
    task = m.comboCount || 0;
    err = (obj.results || []).filter((r) => r.runtimeErrorMessage).length;
  }
  return {
    elapsedMs: m.elapsedMs || 0,
    taskCount: task,
    errorCount: err,
    errorRate: task ? Number((err / task).toFixed(4)) : 0,
    engine: acc.engine || 'node',
    requested: !!acc.requested,
    used: !!acc.used,
    fallbackReason: acc.fallbackReason || '',
    sidecarElapsedMs: acc.sidecarElapsedMs || 0,
  };
}

const entries = [];
for (const c of cmds) {
  const nodeObj = readJson(path.join(dir, `${c}-node.json`));
  const rustObj = readJson(path.join(dir, `${c}-rust.json`));
  const node = metrics(c, nodeObj);
  const rust = metrics(c, rustObj);
  const deltaMs = rust.elapsedMs - node.elapsedMs;
  const deltaPct = node.elapsedMs ? Number(((deltaMs / node.elapsedMs) * 100).toFixed(1)) : 0;
  entries.push({ command: c, node, rust, deltaMs, deltaPct });
}

const summary = {
  generatedAt: new Date().toISOString(),
  entries,
};

fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2));

const md = [];
md.push('# Real Project Comparison (Node vs SIGNALER_RUST_NETWORK=1)');
md.push('');
md.push(`Generated: ${summary.generatedAt}`);
md.push('');
md.push('| Command | Node elapsed(ms) | Rust elapsed(ms) | Delta(ms) | Delta(%) | Node errors | Rust errors | Node engine | Rust engine | Rust used |');
md.push('|---|---:|---:|---:|---:|---:|---:|---|---|---|');
for (const e of entries) {
  md.push(`| ${e.command} | ${e.node.elapsedMs} | ${e.rust.elapsedMs} | ${e.deltaMs} | ${e.deltaPct}% | ${e.node.errorCount}/${e.node.taskCount} | ${e.rust.errorCount}/${e.rust.taskCount} | ${e.node.engine} | ${e.rust.engine} | ${e.rust.used} |`);
}
md.push('');
md.push('## Rust fallback notes');
for (const e of entries) {
  if (e.rust.fallbackReason) {
    md.push(`- ${e.command}: ${String(e.rust.fallbackReason).slice(0, 220)}`);
  }
}

fs.writeFileSync(path.join(dir, 'summary.md'), `${md.join('\n')}\n`);
console.log(path.join(dir, 'summary.json'));
console.log(path.join(dir, 'summary.md'));

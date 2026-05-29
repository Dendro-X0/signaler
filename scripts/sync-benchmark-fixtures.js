#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(".");
const OUT = resolve(ROOT, "benchmarks/out");
const FIXTURES = resolve(ROOT, "benchmarks/fixtures");

const SYNC_GROUPS = [
  { from: "gates", files: ["v3-release-gate.json", "v3-release-gate.md", "phase6-release-gate.json", "phase6-release-gate.md", "v63-success-gate.json", "v63-success-gate.md", "workstream-j-gate.json", "workstream-j-gate.md"] },
  { from: "baselines", files: ["phase0-baseline.json", "phase0-baseline.md", "phase4-baseline.json", "phase4-baseline.md"] },
  {
    from: "evidence",
    files: [
      "v63-loop-smoke.json",
      "v63-loop-smoke.md",
      "v63-low-memory-evidence.json",
      "v63-low-memory-evidence.md",
      "workstream-j-optional-input-overhead.json",
      "workstream-j-optional-input-overhead.md",
      "workstream-k-rust-benchmark-normalizer-perf.json",
      "workstream-k-rust-benchmark-normalizer-perf.md",
    ],
  },
];

function copyFlat(fileName, destDir) {
  const source = join(OUT, fileName);
  const dest = join(destDir, fileName);
  if (!existsSync(source)) {
    console.warn(`[sync-fixtures] skip missing: ${source}`);
    return false;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(source, dest);
  console.log(`[sync-fixtures] ${fileName} -> ${dest.replace(ROOT + "/", "")}`);
  return true;
}

let copied = 0;
for (const group of SYNC_GROUPS) {
  const destDir = join(FIXTURES, group.from);
  mkdirSync(destDir, { recursive: true });
  for (const fileName of group.files) {
    if (copyFlat(fileName, destDir)) copied += 1;
  }
}

if (copied === 0) {
  console.error("[sync-fixtures] nothing copied. Run bench:*:gate commands first (writes to benchmarks/out/).");
  process.exit(1);
}

console.log(`[sync-fixtures] copied ${copied} file(s). Review and commit benchmarks/fixtures/.`);

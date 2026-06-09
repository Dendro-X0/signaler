#!/usr/bin/env node

/**
 * Verify package.json version matches a git tag before pushing releases.
 *
 * Usage:
 *   node scripts/check-release-tag.js v5.0.2
 *   pnpm run release:check-tag -- v5.0.2
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tagArg = process.argv[2];
if (!tagArg || tagArg === "--help" || tagArg === "-h") {
  console.log("Usage: pnpm run release:check-tag -- v<semver>");
  console.log("Example: pnpm run release:check-tag -- v5.0.2");
  process.exit(tagArg ? 0 : 1);
}

const tag = tagArg.startsWith("v") ? tagArg.slice(1) : tagArg;
const pkgPath = resolve(process.cwd(), "package.json");
const jsrPath = resolve(process.cwd(), "jsr.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const jsr = JSON.parse(readFileSync(jsrPath, "utf8"));
const notesPath = resolve(process.cwd(), `docs/archive/release-notes/RELEASE-NOTES-v${tag}.md`);

let failed = false;

if (pkg.version !== tag) {
  console.error(`Tag/version mismatch: tag=v${tag} package.json=${pkg.version}`);
  console.error("Bump package.json (and jsr.json) before creating the tag.");
  failed = true;
}

if (jsr.version !== tag) {
  console.error(`Tag/version mismatch: tag=v${tag} jsr.json=${jsr.version}`);
  failed = true;
}

try {
  readFileSync(notesPath);
} catch {
  console.error(`Missing release notes: docs/archive/release-notes/RELEASE-NOTES-v${tag}.md`);
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(`OK: v${tag} matches package.json, jsr.json, and release notes.`);

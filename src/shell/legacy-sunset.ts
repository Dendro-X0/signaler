const warnedKeys = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warnedKeys.has(key)) {
    return;
  }
  warnedKeys.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
}

/** Warn when `--contract legacy` is the implicit default (removal target: v5.3.0). */
export function warnLegacyContractDefault(): void {
  warnOnce(
    "contract-legacy-default",
    "[signaler] Default artifact contract is legacy. Prefer `--contract v3` (legacy default removal planned for v5.3.0).",
  );
}

/** Warn when falling back to `.apex-auditor` output directory. */
export function warnLegacyOutputDirFallback(): void {
  warnOnce(
    "apex-auditor-output-dir",
    "[signaler] Using legacy `.apex-auditor` output directory. Migrate artifacts to `.signaler` (fallback removal planned for v5.3.0).",
  );
}

export function resetLegacySunsetWarningsForTests(): void {
  warnedKeys.clear();
}

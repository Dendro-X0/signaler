type EngineJsonMode = {
  readonly enabled: boolean;
};

/**
 * Resolve whether the engine should emit NDJSON progress events to stdout.
 *
 * Enabled via `--engine-json`.
 *
 * @param argv - Process argv.
 */
export function resolveEngineJsonMode(argv: readonly string[]): EngineJsonMode {
  for (let i: number = 2; i < argv.length; i += 1) {
    const arg: string = argv[i] ?? "";
    if (arg === "--engine-json") {
      return { enabled: true };
    }
  }
  return { enabled: false };
}

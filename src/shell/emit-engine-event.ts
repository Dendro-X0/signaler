import type { EngineEventPayload } from "../engine-contracts/events/index.js";

/**
 * Emit a single NDJSON engine event to the shell event sink (stdout by default).
 */
export function emitEngineEvent(event: EngineEventPayload): void {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

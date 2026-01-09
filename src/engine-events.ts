import type { EngineEventPayload } from "./engine-events-schema.js";

/**
 * Emit a single NDJSON engine event.
 *
 * @param event - The event payload.
 */
export function emitEngineEvent(event: EngineEventPayload): void {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

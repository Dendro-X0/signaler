import { describe, expect, it } from "vitest";

describe("shell/engine isolation", () => {
  it(
    "resolves shell and engine entry surfaces",
    async () => {
      const shell = await import("../src/shell/index.js");
      const engine = await import("../src/engine/index.js");
      expect(typeof shell.emitEngineEvent).toBe("function");
      expect(typeof engine.writeEngineRunIndex).toBe("function");
      expect(typeof engine.executeEngineJob).toBe("function");
      expect(typeof engine.buildAgentPresetJob).toBe("function");
      expect(typeof engine.createInProcessEngineJobStepRunner).toBe("function");
    },
    120_000,
  );

  it("keeps legacy helper import paths via compatibility shims", async () => {
    const legacyEvents = await import("../src/engine-events.js");
    const canonicalEvents = await import("../src/shell/emit-engine-event.js");
    expect(legacyEvents.emitEngineEvent).toBe(canonicalEvents.emitEngineEvent);

    const legacyIndex = await import("../src/write-engine-run-index.js");
    const canonicalIndex = await import("../src/engine/artifacts/write-run-index.js");
    expect(legacyIndex.writeEngineRunIndex).toBe(canonicalIndex.writeEngineRunIndex);
  });
});

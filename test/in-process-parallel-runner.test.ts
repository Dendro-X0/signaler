import { afterEach, describe, expect, it, vi } from "vitest";
import { usesInProcessParallelRunner } from "../src/runners/lighthouse/in-process-parallel-policy.js";

describe("usesInProcessParallelRunner", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to true on win32", () => {
    vi.stubGlobal("process", { ...process, platform: "win32" });
    expect(usesInProcessParallelRunner()).toBe(true);
  });

  it("defaults to false on linux", () => {
    vi.stubGlobal("process", { ...process, platform: "linux" });
    expect(usesInProcessParallelRunner()).toBe(false);
  });

  it("honors SIGNALER_IN_PROCESS_PARALLEL=1 on any platform", () => {
    vi.stubGlobal("process", { ...process, platform: "linux" });
    vi.stubEnv("SIGNALER_IN_PROCESS_PARALLEL", "1");
    expect(usesInProcessParallelRunner()).toBe(true);
  });

  it("honors SIGNALER_IN_PROCESS_PARALLEL=0 on win32", () => {
    vi.stubGlobal("process", { ...process, platform: "win32" });
    vi.stubEnv("SIGNALER_IN_PROCESS_PARALLEL", "0");
    expect(usesInProcessParallelRunner()).toBe(false);
  });
});

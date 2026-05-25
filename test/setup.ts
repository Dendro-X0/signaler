import { afterEach, vi } from "vitest";

// Prevent cross-file leakage of console/process spies under parallel test files.
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

import { get } from "node:http";

export async function probeUrlReachable(url: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const request = get(url, { timeout: timeoutMs }, (response) => {
      response.resume();
      const statusCode = response.statusCode ?? 0;
      resolve(statusCode >= 200 && statusCode < 400);
    });
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

export async function waitForUrlReachable(params: {
  readonly url: string;
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
}): Promise<void> {
  const timeoutMs = params.timeoutMs ?? 120_000;
  const intervalMs = params.intervalMs ?? 1000;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await probeUrlReachable(params.url, intervalMs)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${params.url} to become reachable (${timeoutMs}ms).`);
}

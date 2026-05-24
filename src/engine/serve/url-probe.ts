import { get } from "node:http";

export type UrlProbeResult = {
  readonly reachable: boolean;
  readonly statusCode?: number;
};

export async function probeUrl(params: {
  readonly url: string;
  readonly timeoutMs?: number;
}): Promise<UrlProbeResult> {
  const timeoutMs = params.timeoutMs ?? 5000;
  return new Promise((resolve) => {
    const request = get(params.url, { timeout: timeoutMs }, (response) => {
      response.resume();
      resolve({
        reachable: true,
        statusCode: response.statusCode ?? 0,
      });
    });
    request.on("timeout", () => {
      request.destroy();
      resolve({ reachable: false });
    });
    request.on("error", () => resolve({ reachable: false }));
  });
}

export async function probeUrlReachable(url: string, timeoutMs = 5000): Promise<boolean> {
  const result = await probeUrl({ url, timeoutMs });
  if (!result.reachable || result.statusCode === undefined) {
    return false;
  }
  return result.statusCode >= 200 && result.statusCode < 400;
}

/** True when something responds on the URL (including HTTP 4xx/5xx). */
export async function probeUrlListening(url: string, timeoutMs = 5000): Promise<boolean> {
  const result = await probeUrl({ url, timeoutMs });
  return result.reachable;
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

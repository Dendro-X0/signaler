/**
 * Windows fork+IPC worker pools often emit "Worker disconnected".
 * Use the stdio worker subprocess pool instead (one Node process per worker).
 */
export function usesInProcessParallelRunner(): boolean {
  const raw = process.env.SIGNALER_IN_PROCESS_PARALLEL?.trim();
  if (raw === "0") {
    return false;
  }
  if (raw === "1") {
    return true;
  }
  return process.platform === "win32";
}

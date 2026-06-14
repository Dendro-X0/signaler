/**
 * Classifies parallel-runner failures so route-level Lighthouse/Chrome issues
 * do not trigger global worker-pool collapse (failure-storm backoff).
 */

const ROUTE_SCOPED_PATTERNS: readonly RegExp[] = [
  /worker disconnected/i,
  /worker response timeout/i,
  /worker failure/i,
  /worker send failed/i,
  /worker exited/i,
  /signaler timeout/i,
  /lighthouse did not return/i,
  /target closed/i,
  /targetcloseerror/i,
];

/** Failures tied to a single combo — retry or skip; do not reduce global parallelism. */
export function isRouteScopedRunnerFailure(errorMessage: string): boolean {
  if (!errorMessage) {
    return true;
  }
  return ROUTE_SCOPED_PATTERNS.some((pattern) => pattern.test(errorMessage));
}

/** Max attempts for a single combo when failures are route-scoped. */
export const ROUTE_SCOPED_MAX_ATTEMPTS = 1;

/** Max attempts when failure looks infrastructure-wide (rare in parent handler). */
export const INFRASTRUCTURE_MAX_ATTEMPTS = 3;

export function maxAttemptsForRunnerFailure(errorMessage: string): number {
  return isRouteScopedRunnerFailure(errorMessage) ? ROUTE_SCOPED_MAX_ATTEMPTS : INFRASTRUCTURE_MAX_ATTEMPTS;
}

export function shouldReplaceWorkerAfterFailure(errorMessage: string): boolean {
  return (
    /worker disconnected/i.test(errorMessage) ||
    /worker send failed/i.test(errorMessage) ||
    /worker exited/i.test(errorMessage) ||
    /worker response timeout/i.test(errorMessage)
  );
}

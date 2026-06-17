import { describe, expect, it } from "vitest";
import {
  isRouteScopedRunnerFailure,
  maxAttemptsForRunnerFailure,
  ROUTE_SCOPED_MAX_ATTEMPTS,
  shouldReplaceWorkerAfterFailure,
} from "../src/runners/lighthouse/runner-failure-policy.js";
import {
  auditScoreCoverage,
  classifyPreflightProbe,
  pageDeviceSummaryHasScores,
} from "../src/runners/lighthouse/route-preflight.js";

describe("runner failure policy", () => {
  it("treats worker disconnect as route-scoped", () => {
    expect(isRouteScopedRunnerFailure("Worker disconnected")).toBe(true);
    expect(maxAttemptsForRunnerFailure("Worker disconnected")).toBe(ROUTE_SCOPED_MAX_ATTEMPTS);
  });

  it("uses fewer attempts for route-scoped failures than infrastructure", () => {
    expect(maxAttemptsForRunnerFailure("Worker disconnected")).toBeLessThan(
      maxAttemptsForRunnerFailure("Pool exhausted"),
    );
  });

  it("only replaces workers after IPC/process failures", () => {
    expect(shouldReplaceWorkerAfterFailure("Worker disconnected")).toBe(true);
    expect(shouldReplaceWorkerAfterFailure("Lighthouse did not return a valid result")).toBe(false);
  });
});

describe("route preflight", () => {
  it("detects auth-wall redirects", () => {
    const result = classifyPreflightProbe({
      requestedPath: "/dashboard/user/orders",
      probe: {
        statusCode: 200,
        finalPath: "/login",
        finalUrl: "http://127.0.0.1:3000/login",
        bodySample: "",
      },
    });
    expect(result.status).toBe("auth-wall");
  });

  it("passes public routes", () => {
    const result = classifyPreflightProbe({
      requestedPath: "/",
      probe: {
        statusCode: 200,
        finalPath: "/",
        finalUrl: "http://127.0.0.1:3000/",
        bodySample: "<html><body>Welcome</body></html>",
      },
    });
    expect(result.status).toBe("ok");
  });

  it("marks 401 as auth-wall", () => {
    const result = classifyPreflightProbe({
      requestedPath: "/dashboard",
      probe: {
        statusCode: 401,
        finalPath: "/dashboard",
        finalUrl: "http://127.0.0.1:3000/dashboard",
        bodySample: "",
      },
    });
    expect(result.status).toBe("auth-wall");
  });

  it("detects server env errors in HTML body", () => {
    const result = classifyPreflightProbe({
      requestedPath: "/shop",
      probe: {
        statusCode: 200,
        finalPath: "/shop",
        finalUrl: "http://127.0.0.1:3000/shop",
        bodySample: "Invalid auth environment variables: BETTER_AUTH_SECRET: Required",
      },
    });
    expect(result.status).toBe("unreachable");
  });

  it("detects login HTML on protected dashboard routes", () => {
    const result = classifyPreflightProbe({
      requestedPath: "/dashboard/user/wishlist",
      probe: {
        statusCode: 200,
        finalPath: "/dashboard/user/wishlist",
        finalUrl: "http://127.0.0.1:3000/dashboard/user/wishlist",
        bodySample: "<h1>Sign in to continue</h1>",
      },
    });
    expect(result.status).toBe("auth-wall");
  });

  it("passes redirect-only index routes that resolve to in-app paths", () => {
    const result = classifyPreflightProbe({
      requestedPath: "/dashboard/admin",
      probe: {
        statusCode: 200,
        finalPath: "/dashboard/admin/dashboard/overview",
        finalUrl: "http://127.0.0.1:3000/dashboard/admin/dashboard/overview",
        bodySample: "<html><body>Admin overview</body></html>",
      },
    });
    expect(result.status).toBe("ok");
    expect(result.reason).toContain("redirect resolved");
  });
});

describe("audit score coverage", () => {
  it("excludes preflight skips from expected score denominator", () => {
    const coverage = auditScoreCoverage({
      summaries: [
        { scores: { performance: 90 }, runtimeErrorMessage: undefined },
        { scores: {}, runtimeErrorMessage: "Skipped (auth-wall): /dashboard/user" },
        { scores: {}, runtimeErrorMessage: "Worker disconnected" },
      ],
    });
    expect(coverage.skipped).toBe(1);
    expect(coverage.expectedToScore).toBe(2);
    expect(coverage.scored).toBe(1);
    expect(coverage.rate).toBe(0.5);
  });

  it("detects scored summaries", () => {
    expect(pageDeviceSummaryHasScores({ scores: { performance: 80 } })).toBe(true);
    expect(pageDeviceSummaryHasScores({ scores: {}, runtimeErrorMessage: "Worker disconnected" })).toBe(false);
  });
});

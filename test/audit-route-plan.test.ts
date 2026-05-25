import { describe, expect, it } from "vitest";
import {
  applyRouteListFilter,
  comboMeetsIncrementalSkipCriteria,
  filterConfigSkipPassing,
  resolveIncrementalSkipCriteria,
} from "../src/audit-route-plan.js";
import type { ApexConfig } from "../src/core/types.js";
import type { PageDeviceSummary } from "../src/types.js";

const baseConfig: ApexConfig = {
  baseUrl: "http://127.0.0.1:3000",
  pages: [
    { path: "/", label: "home", devices: ["mobile", "desktop"] },
    { path: "/blog", label: "blog", devices: ["mobile"] },
    { path: "/admin", label: "admin", devices: ["desktop"] },
  ],
};

describe("audit-route-plan", () => {
  it("filters pages by include and exclude path patterns", () => {
    const filtered = applyRouteListFilter(baseConfig.pages, {
      includePaths: ["/", "/blog/*"],
      excludePaths: ["/admin"],
    });
    expect(filtered.map((page) => page.path)).toEqual(["/", "/blog"]);
  });

  it("skips combos that met incremental pass criteria", () => {
    const previous: PageDeviceSummary[] = [
      {
        url: "http://127.0.0.1:3000/",
        path: "/",
        label: "home",
        device: "mobile",
        scores: { performance: 95, accessibility: 95, bestPractices: 95, seo: 95 },
        metrics: {},
        opportunities: [],
        failedAudits: [],
      },
      {
        url: "http://127.0.0.1:3000/blog",
        path: "/blog",
        label: "blog",
        device: "mobile",
        scores: { performance: 50 },
        metrics: {},
        opportunities: [],
        failedAudits: [],
      },
    ];
    const criteria = resolveIncrementalSkipCriteria({ fromConfig: { minPerformanceScore: 90 } });
    const result = filterConfigSkipPassing({ previous, config: baseConfig, criteria });
    expect(result.skippedCombos).toBe(1);
    expect(result.config.pages).toEqual([
      { path: "/", label: "home", devices: ["desktop"] },
      { path: "/blog", label: "blog", devices: ["mobile"] },
      { path: "/admin", label: "admin", devices: ["desktop"] },
    ]);
  });

  it("does not skip combos with runtime errors when required", () => {
    const previous: PageDeviceSummary = {
      url: "http://127.0.0.1:3000/",
      path: "/",
      label: "home",
      device: "mobile",
      scores: { performance: 99 },
      metrics: {},
      opportunities: [],
      failedAudits: [],
      runtimeErrorMessage: "timeout",
    };
    expect(
      comboMeetsIncrementalSkipCriteria(
        previous,
        resolveIncrementalSkipCriteria({ fromConfig: { requireNoRuntimeErrors: true } }),
      ),
    ).toBe(false);
  });
});

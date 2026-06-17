import { describe, expect, it } from "vitest";
import {
  countExcludedCombos,
  partitionPagesByPreflight,
} from "../src/engine/route-auditability.js";
import type { ApexPageConfig } from "../src/core/types.js";
import type { RoutePreflightResult } from "../src/runners/lighthouse/route-preflight.js";

describe("route-auditability", () => {
  const pages: readonly ApexPageConfig[] = [
    { path: "/", label: "home", devices: ["mobile", "desktop"] },
    { path: "/dashboard", label: "dashboard", devices: ["mobile", "desktop"] },
    { path: "/shop", label: "shop", devices: ["mobile"] },
  ];

  it("partitions auditable and excluded pages from preflight results", () => {
    const preflight = new Map<string, RoutePreflightResult>([
      ["/", { path: "/", status: "ok", httpStatus: 200, finalPath: "/" }],
      [
        "/dashboard",
        {
          path: "/dashboard",
          status: "auth-wall",
          httpStatus: 200,
          finalPath: "/dashboard",
          reason: "protected route without session (login HTML detected)",
        },
      ],
      ["/shop", { path: "/shop", status: "ok", httpStatus: 200, finalPath: "/shop" }],
    ]);
    const { auditable, excluded } = partitionPagesByPreflight(pages, preflight);
    expect(auditable.map((page) => page.path)).toEqual(["/", "/shop"]);
    expect(excluded).toHaveLength(1);
    expect(excluded[0]?.path).toBe("/dashboard");
  });

  it("counts excluded device combos", () => {
    const excluded = [
      {
        label: "dashboard",
        path: "/dashboard",
        status: "auth-wall" as const,
        reason: "login HTML",
      },
    ];
    expect(countExcludedCombos(pages, excluded)).toBe(2);
  });
});

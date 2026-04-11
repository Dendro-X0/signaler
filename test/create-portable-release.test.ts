import { describe, expect, it } from "vitest";
import { createRuntimePackageJson } from "../scripts/create-portable-release.js";

describe("create portable release script", () => {
  it("creates a runtime package manifest without the self-referential package dependency", () => {
    const manifest = createRuntimePackageJson({
      version: "3.1.4",
      description: "desc",
      type: "module",
      license: "MIT",
      engines: { node: ">=18.0.0" },
      dependencies: {
        "@signaler/cli": "npm:@jsr/signaler__cli@^2.6.3",
        zod: "^4.3.6",
      },
    });

    expect(manifest.name).toBe("@signaler/cli-portable");
    expect(manifest.private).toBe(true);
    expect(manifest.version).toBe("3.1.4");
    expect(manifest.dependencies?.["@signaler/cli"]).toBeUndefined();
    expect(manifest.dependencies?.zod).toBe("^4.3.6");
  });
});

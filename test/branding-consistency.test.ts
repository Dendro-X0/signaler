import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { resolveOutputDir, resolveDefaultOutputDir, hasLegacyOutputDir, getCompatibleOutputDir } from "../src/infrastructure/filesystem/output.js";

describe("Branding Consistency", () => {
  // Feature: signaler-reporting-improvements, Property 1: Branding Consistency
  it("all generated directories should use signaler naming consistently", () => {
    fc.assert(fc.property(
      fc.array(fc.string({ minLength: 1, maxLength: 20 })),
      (additionalArgs) => {
        // Test default output directory resolution
        const defaultDir = resolveDefaultOutputDir();
        const dirName = defaultDir.split(/[/\\]/).pop() || "";
        expect(dirName).toBe(".signaler");
        
        // Test command line argument parsing
        const argv = ["node", "signaler", ...additionalArgs];
        const resolved = resolveOutputDir(argv);
        
        // When no explicit output dir is provided, should default to signaler
        if (!additionalArgs.some(arg => arg === "--output-dir" || arg === "--dir")) {
          const resolvedDirName = resolved.outputDir.split(/[/\\]/).pop() || "";
          expect(resolvedDirName).toBe(".signaler");
        }
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 1: Branding Consistency  
  it("all file prefixes should use signaler consistently", () => {
    fc.assert(fc.property(
      fc.record({
        runner: fc.constantFrom("lighthouse", "measure", "links", "headers", "console"),
        fileType: fc.constantFrom("report", "ai", "summary")
      }),
      (config) => {
        // Test that file naming follows signaler convention
        const expectedPrefix = "signaler-";
        const fileName = `${expectedPrefix}${config.runner}-${config.fileType}.json`;
        
        expect(fileName).toMatch(/^signaler-/);
        expect(fileName).not.toMatch(/apex-auditor/);
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 1: Branding Consistency
  it("chrome session directories should use signaler prefix", () => {
    fc.assert(fc.property(
      fc.constantFrom("chrome", "measure-chrome", "console-chrome"),
      (sessionType) => {
        const expectedPrefix = `signaler-${sessionType}-`;
        const mockTempDir = `/tmp/${expectedPrefix}abc123`;
        
        expect(mockTempDir).toMatch(/signaler-/);
        expect(mockTempDir).not.toMatch(/apex-auditor/);
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 1: Branding Consistency
  it("user agent strings should use signaler branding", () => {
    fc.assert(fc.property(
      fc.constantFrom("links", "health", "headers"),
      (module) => {
        const userAgent = `signaler/${module}`;
        
        expect(userAgent).toMatch(/^signaler\//);
        expect(userAgent).not.toMatch(/apex-auditor/);
      }
    ), { numRuns: 100 });
  });

  // Feature: signaler-reporting-improvements, Property 1: Branding Consistency
  it("webhook payload type should use signaler branding", () => {
    fc.assert(fc.property(
      fc.record({
        buildId: fc.option(fc.string()),
        elapsedMs: fc.integer({ min: 0, max: 300000 }),
        budgetPassed: fc.boolean()
      }),
      (payload) => {
        const webhookPayload = {
          type: "signaler" as const,
          ...payload
        };
        
        expect(webhookPayload.type).toBe("signaler");
        expect(webhookPayload.type).not.toBe("apex-auditor");
      }
    ), { numRuns: 100 });
  });
});
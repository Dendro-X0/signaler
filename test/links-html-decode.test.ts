import { describe, expect, it } from "vitest";
import { decodeHtmlUrlEntities } from "../src/links-cli.js";

describe("links html url decoding", () => {
  it("decodes ampersands in Next.js image optimizer src attributes", () => {
    const raw =
      "/_next/image?url=%2Fposts_management.png&amp;w=3840&amp;q=75";
    expect(decodeHtmlUrlEntities(raw)).toBe(
      "/_next/image?url=%2Fposts_management.png&w=3840&q=75",
    );
  });

  it("leaves already-normalized query strings unchanged", () => {
    const raw = "/_next/image?url=%2Fposts_management.png&w=3840&q=75";
    expect(decodeHtmlUrlEntities(raw)).toBe(raw);
  });
});

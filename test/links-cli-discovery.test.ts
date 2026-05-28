import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { resolveInternalUrl } from "../src/loopback-origin.js";

function extractSitemapUrls(xml: string): readonly string[] {
  const matches: IterableIterator<RegExpMatchArray> = xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi);
  const urls: string[] = [];
  for (const m of matches) {
    const value: string | undefined = m[1];
    if (value) {
      urls.push(value.trim());
    }
  }
  return urls;
}

function discoverFromSitemapBody(body: string, auditOrigin: string): readonly string[] {
  const discovered: string[] = [];
  for (const url of extractSitemapUrls(body)) {
    const resolved = resolveInternalUrl(url, auditOrigin);
    if (resolved) {
      discovered.push(resolved);
    }
  }
  return discovered;
}

describe("links sitemap discovery", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
      server = undefined;
    }
  });

  it("accepts localhost sitemap URLs when auditing 127.0.0.1", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>http://localhost:3000/</loc></url>
  <url><loc>http://localhost:3000/blog/post-one</loc></url>
</urlset>`;
    expect(discoverFromSitemapBody(xml, "http://127.0.0.1:3000")).toEqual([
      "http://127.0.0.1:3000/",
      "http://127.0.0.1:3000/blog/post-one",
    ]);
  });

  it("fetches sitemap from mock server and resolves loopback URLs", async () => {
    const sitemapBody = `<urlset><url><loc>http://localhost:3999/about</loc></url></urlset>`;
    server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/xml" });
      res.end(sitemapBody);
    });
    await new Promise<void>((resolve) => server!.listen(3999, "127.0.0.1", () => resolve()));

    const response = await fetch("http://127.0.0.1:3999/sitemap.xml");
    const body = await response.text();
    expect(discoverFromSitemapBody(body, "http://127.0.0.1:3999")).toEqual(["http://127.0.0.1:3999/about"]);
  });
});

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

type StaticServer = {
  readonly baseUrl: string;
  readonly port: number;
  readonly close: () => Promise<void>;
};

function contentTypeForPath(path: string): string {
  const ext: string = extname(path).toLowerCase();
  if (ext === ".html") {
    return "text/html; charset=utf-8";
  }
  if (ext === ".css") {
    return "text/css; charset=utf-8";
  }
  if (ext === ".js") {
    return "text/javascript; charset=utf-8";
  }
  if (ext === ".json") {
    return "application/json; charset=utf-8";
  }
  if (ext === ".svg") {
    return "image/svg+xml";
  }
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  if (ext === ".ico") {
    return "image/x-icon";
  }
  if (ext === ".txt") {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}

function respondNotFound(res: ServerResponse): void {
  res.statusCode = 404;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end("Not found");
}

function safeJoin(root: string, urlPath: string): string | undefined {
  const decoded: string = decodeURIComponent(urlPath);
  const withoutQuery: string = decoded.split("?")[0] ?? decoded;
  const withoutHash: string = (withoutQuery.split("#")[0] ?? withoutQuery).trim();
  const raw: string = withoutHash.startsWith("/") ? withoutHash.slice(1) : withoutHash;
  const normal: string = normalize(raw);
  if (normal.includes("..") || normal.includes("\\0")) {
    return undefined;
  }
  return join(root, normal);
}

/**
 * Start a lightweight local static file server.
 */
export async function startStaticServer(params: { readonly rootDir: string }): Promise<StaticServer> {
  const rootDir: string = resolve(params.rootDir);
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }
    const rawUrl: string = req.url ?? "/";
    const targetPath: string = rawUrl === "/" || rawUrl.endsWith("/") ? `${rawUrl}index.html` : rawUrl;
    const absolute: string | undefined = safeJoin(rootDir, targetPath);
    if (!absolute) {
      respondNotFound(res);
      return;
    }
    try {
      const s = await stat(absolute);
      if (!s.isFile()) {
        respondNotFound(res);
        return;
      }
      res.statusCode = 200;
      res.setHeader("content-type", contentTypeForPath(absolute));
      res.setHeader("cache-control", "no-store");
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      const stream = createReadStream(absolute);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Server error");
          return;
        }
        try {
          res.end();
        } catch {
          return;
        }
      });
      stream.pipe(res);
    } catch {
      respondNotFound(res);
    }
  });

  await new Promise<void>((resolvePromise) => {
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });

  const address = server.address();
  const port: number = typeof address === "object" && address ? address.port : 0;
  const baseUrl: string = `http://127.0.0.1:${port}`;

  const close = async (): Promise<void> => {
    await new Promise<void>((resolvePromise) => {
      server.close(() => resolvePromise());
    });
  };

  return { baseUrl, port, close };
}

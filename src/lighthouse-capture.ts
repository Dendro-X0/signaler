import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

type CaptureLevel = "diagnostics" | "lhr";

type CaptureKey = {
  readonly label: string;
  readonly path: string;
  readonly device: "mobile" | "desktop";
};

type DecodedImage = {
  readonly buffer: Buffer;
  readonly extension: "png" | "jpg" | "webp";
};

type LighthouseAuditDetailsTableLike = {
  readonly type?: string;
  readonly headings?: unknown;
  readonly items?: unknown;
  readonly overallSavingsMs?: number;
  readonly overallSavingsBytes?: number;
};

type LighthouseAuditLike = {
  readonly id?: string;
  readonly title?: string;
  readonly description?: string;
  readonly score?: number;
  readonly scoreDisplayMode?: string;
  readonly numericValue?: number;
  readonly displayValue?: string;
  readonly details?: LighthouseAuditDetailsTableLike;
};

type LighthouseResultLike = {
  readonly audits?: Record<string, unknown>;
};

type CapturedAuditTable = {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly score?: number;
  readonly scoreDisplayMode?: string;
  readonly numericValue?: number;
  readonly displayValue?: string;
  readonly details?: {
    readonly type?: string;
    readonly headings?: unknown;
    readonly items?: unknown;
    readonly overallSavingsMs?: number;
    readonly overallSavingsBytes?: number;
  };
};

type DiagnosticsPayload = {
  readonly meta: {
    readonly label: string;
    readonly path: string;
    readonly device: "mobile" | "desktop";
  };
  readonly audits: readonly CapturedAuditTable[];
};

type JsonPrimitive = string | number | boolean | null;

type DiagnosticsLitePayload = {
  readonly meta: DiagnosticsPayload["meta"];
  readonly audits: readonly {
    readonly id: string;
    readonly title?: string;
    readonly score?: number;
    readonly scoreDisplayMode?: string;
    readonly numericValue?: number;
    readonly displayValue?: string;
    readonly details?: {
      readonly type?: string;
      readonly overallSavingsMs?: number;
      readonly overallSavingsBytes?: number;
      readonly headings?: readonly string[];
      readonly items?: readonly Record<string, JsonPrimitive>[];
      readonly truncated?: boolean;
    };
  }[];
};

const GZIP_MIN_BYTES: number = 50_000;
const MAX_LITE_ITEMS: number = 10;
const MAX_LITE_COLUMNS: number = 10;

const CAPTURED_AUDIT_IDS: readonly string[] = [
  "redirects",
  "server-response-time",
  "uses-text-compression",
  "render-blocking-resources",
  "unused-javascript",
  "legacy-javascript",
  "unminified-javascript",
  "modern-image-formats",
  "uses-optimized-images",
  "uses-responsive-images",
  "efficient-animated-content",
  "critical-request-chains",
  "lcp-phases",
  "largest-contentful-paint-element",
  "total-byte-weight",
  "bf-cache",
] as const;

function toSafeSegment(input: string): string {
  const cleaned: string = input
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
  return cleaned.length > 0 ? cleaned : "item";
}

function buildArtifactBaseName(key: CaptureKey): string {
  const label: string = toSafeSegment(key.label);
  const path: string = toSafeSegment(key.path.replace(/^\//, ""));
  const device: string = key.device;
  return `${label}__${path.length > 0 ? path : "root"}__${device}`;
}

function decodeImageDataUri(dataUri: string): DecodedImage | undefined {
  const match: RegExpMatchArray | null = dataUri.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
  if (!match) {
    return undefined;
  }
  const rawType: string = match[1];
  const extension: "png" | "jpg" | "webp" = rawType === "png" ? "png" : rawType === "webp" ? "webp" : "jpg";
  const base64: string = dataUri.slice(match[0].length);
  try {
    return { buffer: Buffer.from(base64, "base64"), extension };
  } catch {
    return undefined;
  }
}

function extractFinalScreenshotImage(lhr: LighthouseResultLike): DecodedImage | undefined {
  const auditsUnknown: unknown = lhr.audits;
  if (!auditsUnknown || typeof auditsUnknown !== "object") {
    return undefined;
  }
  const audits = auditsUnknown as Record<string, unknown>;
  const finalUnknown: unknown = audits["final-screenshot"];
  if (!finalUnknown || typeof finalUnknown !== "object") {
    const thumbsUnknown: unknown = audits["screenshot-thumbnails"];
    if (!thumbsUnknown || typeof thumbsUnknown !== "object") {
      return undefined;
    }
    const thumbsAudit = thumbsUnknown as { readonly details?: unknown };
    const detailsUnknown: unknown = thumbsAudit.details;
    if (!detailsUnknown || typeof detailsUnknown !== "object") {
      return undefined;
    }
    const details = detailsUnknown as { readonly items?: unknown };
    const itemsUnknown: unknown = details.items;
    if (!Array.isArray(itemsUnknown) || itemsUnknown.length === 0) {
      return undefined;
    }
    const last: unknown = itemsUnknown[itemsUnknown.length - 1];
    if (!last || typeof last !== "object") {
      return undefined;
    }
    const record = last as { readonly data?: unknown };
    if (typeof record.data !== "string") {
      return undefined;
    }
    return decodeImageDataUri(record.data);
  }
  const finalAudit = finalUnknown as { readonly details?: unknown };
  const detailsUnknown: unknown = finalAudit.details;
  if (!detailsUnknown || typeof detailsUnknown !== "object") {
    return undefined;
  }
  const details = detailsUnknown as { readonly data?: unknown };
  const data: unknown = details.data;
  if (typeof data !== "string") {
    return undefined;
  }
  return decodeImageDataUri(data);
}

function toAuditLike(value: unknown): LighthouseAuditLike | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as LighthouseAuditLike;
}

function isCapturableDetailsType(typeValue: unknown): boolean {
  return typeValue === "table" || typeValue === "opportunity";
}

function extractDiagnostics(lhr: LighthouseResultLike, key: CaptureKey): DiagnosticsPayload {
  const auditsUnknown: unknown = lhr.audits;
  const audits: Record<string, unknown> = auditsUnknown && typeof auditsUnknown === "object" ? (auditsUnknown as Record<string, unknown>) : {};
  const captured: CapturedAuditTable[] = [];
  for (const id of CAPTURED_AUDIT_IDS) {
    const audit: LighthouseAuditLike | undefined = toAuditLike(audits[id]);
    if (!audit) {
      continue;
    }
    const details: LighthouseAuditDetailsTableLike | undefined = audit.details;
    const detailsType: unknown = details?.type;
    if (!isCapturableDetailsType(detailsType)) {
      continue;
    }
    captured.push({
      id,
      title: audit.title,
      description: audit.description,
      score: typeof audit.score === "number" ? audit.score : undefined,
      scoreDisplayMode: typeof audit.scoreDisplayMode === "string" ? audit.scoreDisplayMode : undefined,
      numericValue: typeof audit.numericValue === "number" ? audit.numericValue : undefined,
      displayValue: typeof audit.displayValue === "string" ? audit.displayValue : undefined,
      details: {
        type: typeof details?.type === "string" ? details.type : undefined,
        headings: details?.headings,
        items: details?.items,
        overallSavingsMs: typeof details?.overallSavingsMs === "number" ? details.overallSavingsMs : undefined,
        overallSavingsBytes: typeof details?.overallSavingsBytes === "number" ? details.overallSavingsBytes : undefined,
      },
    });
  }
  return {
    meta: { label: key.label, path: key.path, device: key.device },
    audits: captured,
  };
}

function toJsonPrimitive(value: unknown): JsonPrimitive | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value === null) {
    return null;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compactItem(value: unknown): Record<string, JsonPrimitive> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const out: Record<string, JsonPrimitive> = {};
  const keys: readonly string[] = Object.keys(value).slice(0, MAX_LITE_COLUMNS);
  for (const key of keys) {
    const primitive: JsonPrimitive | undefined = toJsonPrimitive(value[key]);
    if (primitive !== undefined) {
      out[key] = primitive;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function extractHeadings(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const headings: string[] = [];
  for (const h of value) {
    if (!isRecord(h)) {
      continue;
    }
    const key: unknown = h.key;
    if (typeof key === "string") {
      headings.push(key);
    }
  }
  return headings.length > 0 ? headings : undefined;
}

function buildDiagnosticsLite(payload: DiagnosticsPayload): DiagnosticsLitePayload {
  const audits = payload.audits.map((a) => {
    const details = a.details;
    if (!details) {
      return {
        id: a.id,
        title: a.title,
        score: a.score,
        scoreDisplayMode: a.scoreDisplayMode,
        numericValue: a.numericValue,
        displayValue: a.displayValue,
      };
    }
    const itemsRaw: unknown = details.items;
    const itemsArray: readonly unknown[] = Array.isArray(itemsRaw) ? itemsRaw : [];
    const truncated: boolean = itemsArray.length > MAX_LITE_ITEMS;
    const compacted: Record<string, JsonPrimitive>[] = [];
    for (const item of itemsArray.slice(0, MAX_LITE_ITEMS)) {
      const compactedItem: Record<string, JsonPrimitive> | undefined = compactItem(item);
      if (compactedItem) {
        compacted.push(compactedItem);
      }
    }
    const headings: readonly string[] | undefined = extractHeadings(details.headings);
    return {
      id: a.id,
      title: a.title,
      score: a.score,
      scoreDisplayMode: a.scoreDisplayMode,
      numericValue: a.numericValue,
      displayValue: a.displayValue,
      details: {
        type: details.type,
        overallSavingsMs: details.overallSavingsMs,
        overallSavingsBytes: details.overallSavingsBytes,
        headings,
        items: compacted.length > 0 ? compacted : undefined,
        truncated: truncated || undefined,
      },
    };
  });
  return { meta: payload.meta, audits };
}

async function writeJsonWithOptionalGzip(absolutePath: string, jsonText: string): Promise<void> {
  await writeFile(absolutePath, `${jsonText}\n`, "utf8");
  if (Buffer.byteLength(jsonText, "utf8") < GZIP_MIN_BYTES) {
    return;
  }
  const gzPath: string = `${absolutePath}.gz`;
  const gz: Buffer = gzipSync(Buffer.from(jsonText, "utf8"));
  await writeFile(gzPath, gz);
}

export async function captureLighthouseArtifacts(params: {
  readonly outputRoot: string;
  readonly captureLevel: CaptureLevel;
  readonly key: CaptureKey;
  readonly lhr: unknown;
}): Promise<void> {
  const lhrUnknown: unknown = params.lhr;
  if (!lhrUnknown || typeof lhrUnknown !== "object") {
    return;
  }
  const lhr: LighthouseResultLike = lhrUnknown as LighthouseResultLike;
  const baseName: string = buildArtifactBaseName(params.key);
  const screenshotsDir: string = resolve(params.outputRoot, "screenshots");
  const diagnosticsDir: string = resolve(params.outputRoot, "lighthouse-artifacts", "diagnostics");
  const diagnosticsLiteDir: string = resolve(params.outputRoot, "lighthouse-artifacts", "diagnostics-lite");
  const lhrDir: string = resolve(params.outputRoot, "lighthouse-artifacts", "lhr");
  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(diagnosticsDir, { recursive: true });
  await mkdir(diagnosticsLiteDir, { recursive: true });
  if (params.captureLevel === "lhr") {
    await mkdir(lhrDir, { recursive: true });
  }

  const screenshot: DecodedImage | undefined = extractFinalScreenshotImage(lhr);
  if (screenshot) {
    await writeFile(resolve(screenshotsDir, `${baseName}.${screenshot.extension}`), screenshot.buffer);
  }

  const diagnostics: DiagnosticsPayload = extractDiagnostics(lhr, params.key);
  const diagnosticsText: string = JSON.stringify(diagnostics, null, 2);
  await writeJsonWithOptionalGzip(resolve(diagnosticsDir, `${baseName}.json`), diagnosticsText);
  const diagnosticsLite: DiagnosticsLitePayload = buildDiagnosticsLite(diagnostics);
  const diagnosticsLiteText: string = JSON.stringify(diagnosticsLite, null, 2);
  await writeJsonWithOptionalGzip(resolve(diagnosticsLiteDir, `${baseName}.json`), diagnosticsLiteText);

  if (params.captureLevel === "lhr") {
    const lhrText: string = JSON.stringify(lhrUnknown, null, 2);
    await writeJsonWithOptionalGzip(resolve(lhrDir, `${baseName}.json`), lhrText);
  }
}

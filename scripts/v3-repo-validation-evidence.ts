import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type RepoValidationEntry = {
  repo: string;
  owner: string;
  publicRepoUrl: string;
  comparedAt: string;
  lighthouseResolvedHighImpact: number;
  signalerResolvedHighImpact: number;
  notes: string;
};

type RepoValidationEvidence = {
  schemaVersion: 1;
  generatedAt: string;
  entries: RepoValidationEntry[];
};

type ParsedArgs = {
  readonly command: "list" | "upsert";
  readonly filePath: string;
  readonly repo?: string;
  readonly owner?: string;
  readonly publicRepoUrl?: string;
  readonly comparedAt?: string;
  readonly lighthouseResolvedHighImpact?: number;
  readonly signalerResolvedHighImpact?: number;
  readonly notes?: string;
};

function usage(): string {
  return [
    "Usage:",
    "  tsx scripts/v3-repo-validation-evidence.ts list [--file release/v3/repo-validation-evidence.json]",
    "  tsx scripts/v3-repo-validation-evidence.ts upsert --repo <name> --owner <owner> --url <https://github.com/org/repo> --date <YYYY-MM-DD> --lighthouse-resolved <n> --signaler-resolved <n> --notes <text> [--file release/v3/repo-validation-evidence.json]",
    "",
    "Examples:",
    "  tsx scripts/v3-repo-validation-evidence.ts list",
    "  tsx scripts/v3-repo-validation-evidence.ts upsert --repo next-blogkit-pro --owner Dendro-X0 --url https://github.com/Dendro-X0/next-blogkit-pro --date 2026-03-20 --lighthouse-resolved 7 --signaler-resolved 11 --notes \"Improved issue-priority outcomes\"",
  ].join("\n");
}

function parseIntegerFlag(name: string, raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${name} '${raw}'. Expected integer >= 0.`);
  }
  return parsed;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const commandRaw = argv[0];
  if (commandRaw !== "list" && commandRaw !== "upsert") {
    throw new Error(`Unknown command '${commandRaw ?? ""}'.\n${usage()}`);
  }
  let filePath = resolve("release/v3/repo-validation-evidence.json");
  let repo: string | undefined;
  let owner: string | undefined;
  let publicRepoUrl: string | undefined;
  let comparedAt: string | undefined;
  let lighthouseResolvedHighImpact: number | undefined;
  let signalerResolvedHighImpact: number | undefined;
  let notes: string | undefined;

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg === "--file" && i + 1 < argv.length) {
      filePath = resolve(argv[i + 1] ?? filePath);
      i += 1;
      continue;
    }
    if (arg.startsWith("--file=")) {
      filePath = resolve(arg.slice("--file=".length));
      continue;
    }
    if (arg === "--repo" && i + 1 < argv.length) {
      repo = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--repo=")) {
      repo = arg.slice("--repo=".length);
      continue;
    }
    if (arg === "--owner" && i + 1 < argv.length) {
      owner = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--owner=")) {
      owner = arg.slice("--owner=".length);
      continue;
    }
    if (arg === "--url" && i + 1 < argv.length) {
      publicRepoUrl = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--url=")) {
      publicRepoUrl = arg.slice("--url=".length);
      continue;
    }
    if (arg === "--date" && i + 1 < argv.length) {
      comparedAt = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--date=")) {
      comparedAt = arg.slice("--date=".length);
      continue;
    }
    if (arg === "--lighthouse-resolved" && i + 1 < argv.length) {
      lighthouseResolvedHighImpact = parseIntegerFlag("--lighthouse-resolved", argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg.startsWith("--lighthouse-resolved=")) {
      lighthouseResolvedHighImpact = parseIntegerFlag("--lighthouse-resolved", arg.slice("--lighthouse-resolved=".length));
      continue;
    }
    if (arg === "--signaler-resolved" && i + 1 < argv.length) {
      signalerResolvedHighImpact = parseIntegerFlag("--signaler-resolved", argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg.startsWith("--signaler-resolved=")) {
      signalerResolvedHighImpact = parseIntegerFlag("--signaler-resolved", arg.slice("--signaler-resolved=".length));
      continue;
    }
    if (arg === "--notes" && i + 1 < argv.length) {
      notes = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--notes=")) {
      notes = arg.slice("--notes=".length);
      continue;
    }
    throw new Error(`Unknown argument '${arg}'.\n${usage()}`);
  }

  return {
    command: commandRaw,
    filePath,
    repo,
    owner,
    publicRepoUrl,
    comparedAt,
    lighthouseResolvedHighImpact,
    signalerResolvedHighImpact,
    notes,
  };
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isPublicRepoUrl(value: string): boolean {
  return /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/i.test(value.trim());
}

function improvementDelta(entry: RepoValidationEntry): number {
  return entry.signalerResolvedHighImpact - entry.lighthouseResolvedHighImpact;
}

function qualifies(entry: RepoValidationEntry): boolean {
  return isPublicRepoUrl(entry.publicRepoUrl) && improvementDelta(entry) > 0;
}

function validateUpsertArgs(args: ParsedArgs): asserts args is ParsedArgs & Required<Pick<
  ParsedArgs,
  "repo" | "owner" | "publicRepoUrl" | "comparedAt" | "lighthouseResolvedHighImpact" | "signalerResolvedHighImpact" | "notes"
>> {
  const requiredStringFields: Array<keyof Pick<ParsedArgs, "repo" | "owner" | "publicRepoUrl" | "comparedAt" | "notes">> = [
    "repo",
    "owner",
    "publicRepoUrl",
    "comparedAt",
    "notes",
  ];
  for (const field of requiredStringFields) {
    const value = args[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Missing required argument --${field.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}.\n${usage()}`);
    }
  }
  if (typeof args.lighthouseResolvedHighImpact !== "number") {
    throw new Error("Missing required argument --lighthouse-resolved.\n" + usage());
  }
  if (typeof args.signalerResolvedHighImpact !== "number") {
    throw new Error("Missing required argument --signaler-resolved.\n" + usage());
  }
  if (!isIsoDate(args.comparedAt)) {
    throw new Error(`Invalid --date '${args.comparedAt}'. Expected YYYY-MM-DD.`);
  }
  if (!isPublicRepoUrl(args.publicRepoUrl)) {
    throw new Error(`Invalid --url '${args.publicRepoUrl}'. Expected public GitHub repo URL.`);
  }
}

async function readEvidence(filePath: string): Promise<RepoValidationEvidence> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<RepoValidationEvidence>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries.filter((entry): entry is RepoValidationEntry => {
      if (typeof entry !== "object" || entry === null) return false;
      const row = entry as Partial<RepoValidationEntry>;
      return (
        typeof row.repo === "string"
        && typeof row.owner === "string"
        && typeof row.publicRepoUrl === "string"
        && typeof row.comparedAt === "string"
        && typeof row.lighthouseResolvedHighImpact === "number"
        && Number.isFinite(row.lighthouseResolvedHighImpact)
        && row.lighthouseResolvedHighImpact >= 0
        && typeof row.signalerResolvedHighImpact === "number"
        && Number.isFinite(row.signalerResolvedHighImpact)
        && row.signalerResolvedHighImpact >= 0
        && typeof row.notes === "string"
      );
    }) : [];
    return {
      schemaVersion: 1,
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : new Date().toISOString(),
      entries,
    };
  } catch {
    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      entries: [],
    };
  }
}

async function writeEvidence(filePath: string, evidence: RepoValidationEvidence): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}

function sortEntries(entries: readonly RepoValidationEntry[]): RepoValidationEntry[] {
  return [...entries].sort((a, b) => {
    const ownerSort = a.owner.localeCompare(b.owner);
    if (ownerSort !== 0) return ownerSort;
    const repoSort = a.repo.localeCompare(b.repo);
    if (repoSort !== 0) return repoSort;
    return a.comparedAt.localeCompare(b.comparedAt);
  });
}

function summarize(evidence: RepoValidationEvidence): {
  readonly total: number;
  readonly qualified: number;
  readonly improving: number;
} {
  const total = evidence.entries.length;
  const improving = evidence.entries.filter((entry) => improvementDelta(entry) > 0).length;
  const qualified = evidence.entries.filter((entry) => qualifies(entry)).length;
  return { total, qualified, improving };
}

function printList(evidence: RepoValidationEvidence): void {
  const summary = summarize(evidence);
  console.log(`[repo-validation] entries=${summary.total} improving=${summary.improving} qualified=${summary.qualified}`);
  if (evidence.entries.length === 0) {
    console.log("[repo-validation] no entries");
    return;
  }
  for (const entry of evidence.entries) {
    const delta = improvementDelta(entry);
    const tag = qualifies(entry) ? "qualified" : delta > 0 ? "improving" : "non-improving";
    console.log(
      `- ${entry.owner}/${entry.repo} ${entry.comparedAt} lighthouse=${entry.lighthouseResolvedHighImpact} signaler=${entry.signalerResolvedHighImpact} delta=${delta >= 0 ? `+${delta}` : `${delta}`} (${tag}) :: ${entry.notes}`,
    );
  }
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const evidence = await readEvidence(args.filePath);
  if (args.command === "list") {
    printList(evidence);
    return;
  }

  validateUpsertArgs(args);
  const nextEntry: RepoValidationEntry = {
    repo: args.repo,
    owner: args.owner,
    publicRepoUrl: args.publicRepoUrl,
    comparedAt: args.comparedAt,
    lighthouseResolvedHighImpact: args.lighthouseResolvedHighImpact,
    signalerResolvedHighImpact: args.signalerResolvedHighImpact,
    notes: args.notes,
  };
  const existingIndex = evidence.entries.findIndex((entry) => entry.repo === nextEntry.repo && entry.owner === nextEntry.owner);
  const updatedEntries = [...evidence.entries];
  if (existingIndex >= 0) {
    updatedEntries[existingIndex] = nextEntry;
  } else {
    updatedEntries.push(nextEntry);
  }
  const nextEvidence: RepoValidationEvidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    entries: sortEntries(updatedEntries),
  };
  await writeEvidence(args.filePath, nextEvidence);
  const summary = summarize(nextEvidence);
  console.log(`[repo-validation] upserted ${nextEntry.owner}/${nextEntry.repo}`);
  console.log(`[repo-validation] file=${args.filePath}`);
  console.log(`[repo-validation] entries=${summary.total} improving=${summary.improving} qualified=${summary.qualified}`);
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[repo-validation] ${message}`);
    process.exitCode = 1;
  });
}

export type { ParsedArgs, RepoValidationEntry, RepoValidationEvidence };
export {
  improvementDelta,
  isIsoDate,
  isPublicRepoUrl,
  parseArgs,
  qualifies,
  sortEntries,
  summarize,
  usage,
};


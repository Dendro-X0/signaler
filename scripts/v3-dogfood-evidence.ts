import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type DogfoodEntry = {
  repo: string;
  owner: string;
  startDate: string;
  endDate: string;
  notes: string;
};

type DogfoodEvidence = {
  schemaVersion: 1;
  generatedAt: string;
  entries: DogfoodEntry[];
};

type ParsedArgs = {
  readonly command: "list" | "upsert";
  readonly filePath: string;
  readonly repo?: string;
  readonly owner?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly notes?: string;
};

function usage(): string {
  return [
    "Usage:",
    "  tsx scripts/v3-dogfood-evidence.ts list [--file release/v3/dogfood-evidence.json]",
    "  tsx scripts/v3-dogfood-evidence.ts upsert --repo <name> --owner <owner> --start <YYYY-MM-DD> --end <YYYY-MM-DD> --notes <text> [--file release/v3/dogfood-evidence.json]",
    "",
    "Examples:",
    "  tsx scripts/v3-dogfood-evidence.ts list",
    "  tsx scripts/v3-dogfood-evidence.ts upsert --repo next-blogkit-pro --owner Dendro-X0 --start 2026-03-01 --end 2026-03-20 --notes \"Phase 1 dogfood\"",
  ].join("\n");
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const commandRaw = argv[0];
  if (commandRaw !== "list" && commandRaw !== "upsert") {
    throw new Error(`Unknown command '${commandRaw ?? ""}'.\n${usage()}`);
  }
  let filePath = resolve("release/v3/dogfood-evidence.json");
  let repo: string | undefined;
  let owner: string | undefined;
  let startDate: string | undefined;
  let endDate: string | undefined;
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
    if (arg === "--start" && i + 1 < argv.length) {
      startDate = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--start=")) {
      startDate = arg.slice("--start=".length);
      continue;
    }
    if (arg === "--end" && i + 1 < argv.length) {
      endDate = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--end=")) {
      endDate = arg.slice("--end=".length);
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

  return { command: commandRaw, filePath, repo, owner, startDate, endDate, notes };
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function daysBetween(startIsoDate: string, endIsoDate: string): number {
  const startMs = Date.parse(`${startIsoDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${endIsoDate}T00:00:00.000Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return -1;
  }
  return Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000));
}

function qualifies(entry: DogfoodEntry): boolean {
  return daysBetween(entry.startDate, entry.endDate) >= 14;
}

function validateUpsertArgs(args: ParsedArgs): asserts args is ParsedArgs & Required<Pick<ParsedArgs, "repo" | "owner" | "startDate" | "endDate" | "notes">> {
  const required: Array<keyof Pick<ParsedArgs, "repo" | "owner" | "startDate" | "endDate" | "notes">> = ["repo", "owner", "startDate", "endDate", "notes"];
  for (const key of required) {
    const value = args[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Missing required argument --${key.replace("Date", "").toLowerCase()}.\n${usage()}`);
    }
  }
  if (!isIsoDate(args.startDate)) {
    throw new Error(`Invalid --start '${args.startDate}'. Expected YYYY-MM-DD.`);
  }
  if (!isIsoDate(args.endDate)) {
    throw new Error(`Invalid --end '${args.endDate}'. Expected YYYY-MM-DD.`);
  }
  if (daysBetween(args.startDate, args.endDate) < 0) {
    throw new Error(`Invalid date range: start=${args.startDate}, end=${args.endDate}.`);
  }
}

async function readEvidence(filePath: string): Promise<DogfoodEvidence> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DogfoodEvidence>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries.filter((entry): entry is DogfoodEntry => {
      if (typeof entry !== "object" || entry === null) return false;
      const candidate = entry as Partial<DogfoodEntry>;
      return (
        typeof candidate.repo === "string"
        && typeof candidate.owner === "string"
        && typeof candidate.startDate === "string"
        && typeof candidate.endDate === "string"
        && typeof candidate.notes === "string"
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

async function writeEvidence(filePath: string, evidence: DogfoodEvidence): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}

function sortEntries(entries: readonly DogfoodEntry[]): DogfoodEntry[] {
  return [...entries].sort((a, b) => {
    const ownerSort = a.owner.localeCompare(b.owner);
    if (ownerSort !== 0) return ownerSort;
    const repoSort = a.repo.localeCompare(b.repo);
    if (repoSort !== 0) return repoSort;
    const startSort = a.startDate.localeCompare(b.startDate);
    if (startSort !== 0) return startSort;
    return a.endDate.localeCompare(b.endDate);
  });
}

function summarize(evidence: DogfoodEvidence): { readonly total: number; readonly qualified: number } {
  const total = evidence.entries.length;
  const qualified = evidence.entries.filter(qualifies).length;
  return { total, qualified };
}

function printList(evidence: DogfoodEvidence): void {
  const summary = summarize(evidence);
  console.log(`[dogfood] file entries=${summary.total} qualified=${summary.qualified}`);
  if (evidence.entries.length === 0) {
    console.log("[dogfood] no entries");
    return;
  }
  for (const entry of evidence.entries) {
    const durationDays = daysBetween(entry.startDate, entry.endDate);
    const tag = durationDays >= 14 ? "qualified" : "short";
    console.log(`- ${entry.owner}/${entry.repo} ${entry.startDate}..${entry.endDate} (${durationDays}d, ${tag}) :: ${entry.notes}`);
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
  const nextEntry: DogfoodEntry = {
    repo: args.repo,
    owner: args.owner,
    startDate: args.startDate,
    endDate: args.endDate,
    notes: args.notes,
  };
  const existingIndex = evidence.entries.findIndex((entry) => entry.repo === nextEntry.repo && entry.owner === nextEntry.owner);
  const updatedEntries = [...evidence.entries];
  if (existingIndex >= 0) {
    updatedEntries[existingIndex] = nextEntry;
  } else {
    updatedEntries.push(nextEntry);
  }
  const nextEvidence: DogfoodEvidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    entries: sortEntries(updatedEntries),
  };
  await writeEvidence(args.filePath, nextEvidence);
  const summary = summarize(nextEvidence);
  console.log(`[dogfood] upserted ${nextEntry.owner}/${nextEntry.repo}`);
  console.log(`[dogfood] file=${args.filePath}`);
  console.log(`[dogfood] entries=${summary.total} qualified=${summary.qualified}`);
}

const SCRIPT_PATH = fileURLToPath(import.meta.url);

if (process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  void run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[dogfood] ${message}`);
    process.exitCode = 1;
  });
}

export type { DogfoodEntry, DogfoodEvidence, ParsedArgs };
export {
  parseArgs,
  daysBetween,
  isIsoDate,
  qualifies,
  summarize,
  sortEntries,
  usage,
};

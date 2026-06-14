import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ARTIFACT_DIRECTORY_RULES, ARTIFACT_RULES } from "./registry.js";
import type { AgentEntrypointsV1, ArtifactLayoutMode, ArtifactManifestV1, ManifestArtifactEntry } from "./types.js";
import { buildIndexMarkdown } from "./index-md.js";
import { pruneFlatRootArtifacts } from "./prune-root.js";

async function copyIfExists(source: string, destination: string): Promise<boolean> {
  if (!existsSync(source)) {
    return false;
  }
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { force: true });
  return true;
}

async function copyDirectoryIfExists(source: string, destination: string): Promise<boolean> {
  if (!existsSync(source)) {
    return false;
  }
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
  return true;
}

function buildAgentEntrypoints(artifacts: readonly ManifestArtifactEntry[], generatedAt: string): AgentEntrypointsV1 {
  const agentArtifacts = ARTIFACT_RULES.filter((rule) => rule.agentReadOrder !== undefined)
    .sort((a, b) => (a.agentReadOrder ?? 0) - (b.agentReadOrder ?? 0));
  const readOrder: Array<{
    readonly id: string;
    readonly path: string;
    readonly note?: string;
  }> = [];
  for (const rule of agentArtifacts) {
    const entry = artifacts.find((item) => item.id === rule.id);
    if (!entry) {
      continue;
    }
    readOrder.push({
      id: rule.id,
      path: entry.path,
      note:
        rule.id === "agent-index"
          ? "Prefer signaler query --view agent"
          : rule.id === "coverage"
            ? "Audit reachability: scored vs skipped routes"
            : undefined,
    });
  }
  return {
    schemaVersion: 1,
    generatedAt,
    readOrder,
    preferCli: [
      "signaler query --view agent --dir .signaler --json",
      "signaler query --view coverage --dir .signaler --json",
      "signaler query --view perf --dir .signaler --json",
      "signaler explain --id <issue-id> --dir .signaler",
    ],
  };
}

const AGENT_README = `# Agent artifacts

Prefer CLI projections — do not list the entire \`.signaler/\` tree:

\`\`\`bash
signaler query --view agent --dir .signaler --json
signaler query --view fix-queue --dir .signaler --json
signaler query --view coverage --dir .signaler --json
signaler query --view perf --dir .signaler --json
signaler explain --id <action-id> --dir .signaler
\`\`\`

Canonical read order (see \`entrypoints.json\`):

1. \`fix-queue.json\` — ranked surgical fix list (path, device, url, savings, pointers)
2. \`coverage.json\` — what was scored vs skipped (auth/env/runner errors)
3. \`performance-triage.json\` — issue-count triage per combo
4. \`analyze.json\` — ranked actions (after analyze step)
5. \`index.json\` — protocol + top suggestion pointers
`;

const DEVELOPER_README = `# Developer reports

Start with [\`../INDEX.md\`](../INDEX.md), then:

- [\`report.html\`](report.html) — visual Lighthouse report
- [\`overview.md\`](overview.md) — top issues summary
- [\`triage.md\`](triage.md) — human triage with links to diagnostics
- [\`reports/\`](reports/) — side-runner reports (headers, links, bundle)
`;

export type MaterializeResult = {
  readonly manifestPath: string;
  readonly indexPath: string;
  readonly copiedCount: number;
  readonly prunedFiles: number;
  readonly prunedDirs: number;
  readonly archivedFiles: number;
};

async function loadExistingManifestArtifacts(root: string): Promise<Map<string, ManifestArtifactEntry>> {
  const manifestPath = resolve(root, "manifest.json");
  if (!existsSync(manifestPath)) {
    return new Map();
  }
  try {
    const raw = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as ArtifactManifestV1;
    return new Map((parsed.artifacts ?? []).map((entry) => [entry.id, entry] as const));
  } catch {
    return new Map();
  }
}

function manifestEntryForRule(rule: (typeof ARTIFACT_RULES)[number]): ManifestArtifactEntry {
  return {
    id: rule.id,
    path: rule.treePath,
    legacyPath: rule.flatPath,
    audience: rule.audience,
    runner: rule.runner,
    weight: rule.weight,
    contract: rule.contract,
  };
}

export async function materializeArtifactLayout(params: {
  readonly outputDir: string;
  readonly layout: ArtifactLayoutMode;
}): Promise<MaterializeResult | undefined> {
  if (params.layout === "flat") {
    return undefined;
  }

  const root = resolve(params.outputDir);
  const generatedAt = new Date().toISOString();
  let copiedCount = 0;
  const manifestById = await loadExistingManifestArtifacts(root);

  for (const rule of ARTIFACT_RULES) {
    const source = resolve(root, rule.flatPath);
    const destination = resolve(root, rule.treePath);
    if (existsSync(source)) {
      await mkdir(dirname(destination), { recursive: true });
      await cp(source, destination, { force: true });
      copiedCount += 1;
    }
    if (existsSync(destination)) {
      manifestById.set(rule.id, manifestEntryForRule(rule));
    } else {
      manifestById.delete(rule.id);
    }
  }

  const manifestArtifacts: ManifestArtifactEntry[] = [...manifestById.values()];

  for (const dirRule of ARTIFACT_DIRECTORY_RULES) {
    const source = resolve(root, dirRule.flatDir);
    const destination = resolve(root, dirRule.treeDir);
    if (await copyDirectoryIfExists(source, destination)) {
      copiedCount += 1;
    }
  }

  const agentEntrypoints = buildAgentEntrypoints(manifestArtifacts, generatedAt);
  const developerEntrypoints = manifestArtifacts
    .filter((entry) => ARTIFACT_RULES.find((rule) => rule.id === entry.id)?.developerEntrypoint)
    .map((entry) => entry.path);
  const ciEntrypoints = manifestArtifacts
    .filter((entry) => entry.audience === "ci")
    .map((entry) => entry.path);

  const manifest: ArtifactManifestV1 = {
    schemaVersion: 1,
    layoutVersion: 1,
    layout: "tree",
    generatedAt,
    entrypoints: {
      agent: ["agent/entrypoints.json"],
      developer: developerEntrypoints.length > 0 ? developerEntrypoints : ["developer/report.html"],
      ci: ciEntrypoints.length > 0 ? ciEntrypoints : ["gates/quality-pack.json"],
    },
    artifacts: manifestArtifacts,
  };

  await mkdir(resolve(root, "agent"), { recursive: true });
  await mkdir(resolve(root, "developer/reports"), { recursive: true });
  await writeFile(resolve(root, "agent/entrypoints.json"), `${JSON.stringify(agentEntrypoints, null, 2)}\n`, "utf8");
  await writeFile(resolve(root, "agent/README.md"), AGENT_README, "utf8");
  await writeFile(resolve(root, "developer/README.md"), DEVELOPER_README, "utf8");

  const manifestPath = resolve(root, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const indexPath = resolve(root, "INDEX.md");
  await writeFile(indexPath, buildIndexMarkdown({ manifest, generatedAt }), "utf8");

  await writeFile(
    resolve(root, "NAVIGATION.md"),
    `# Signaler artifacts navigation\n\nSuperseded by [INDEX.md](INDEX.md). See [manifest.json](manifest.json) for machine-readable layout.\n`,
    "utf8",
  );

  const prune = await pruneFlatRootArtifacts({ outputDir: root, materialized: manifestArtifacts });

  return {
    manifestPath,
    indexPath,
    copiedCount,
    prunedFiles: prune.removedFiles,
    prunedDirs: prune.removedDirs,
    archivedFiles: prune.archivedFiles,
  };
}

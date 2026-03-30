import { mkdir, access, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { constants as fsConstants } from 'node:fs'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const siteRoot = resolve(scriptDir, '..')
const repoRoot = resolve(siteRoot, '..')
const repoCliDocs = resolve(repoRoot, 'docs')
const siblingCliDocs = resolve(repoRoot, '..', 'docs')
const envCliDocs = process.env.CLI_DOCS_DIR ? resolve(process.env.CLI_DOCS_DIR) : null
const outDir = join(siteRoot, 'src', 'content', 'signaler')
const versionOutFile = join(siteRoot, 'src', 'lib', 'version.generated.json')

async function pathExists(p) {
  try { await access(p, fsConstants.F_OK); return true } catch { return false }
}

function normalizeLinkTarget(rawLink) {
  const [pathPart, hashPart] = rawLink.split('#')
  let normalized = pathPart
    .replace(/^\.\//, '')
    .replace(/^(\.\.\/)+/, '')
    .replace(/^docs\//, '')
    .replace(/\.md$/i, '')

  const aliasMap = {
    'README': 'overview',
    'guides/getting-started': 'getting-started',
    'getting-started': 'getting-started',
    'guides/agent-quickstart': 'agent-quickstart',
    'agent-quickstart': 'agent-quickstart',
    'guides/migration': 'migration',
    'MIGRATION': 'migration',
    'guides/ai-optimized-reports': 'ai-optimized-reports',
    'AI-OPTIMIZED-REPORTS': 'ai-optimized-reports',
    'reference/cli': 'cli',
    'cli': 'cli',
    'reference/configuration': 'configuration',
    'configuration': 'configuration',
    'reference/api': 'api-reference',
    'api': 'api-reference',
    'reference/features': 'FEATURES',
    'features': 'FEATURES',
    'reference/testing': 'testing',
    'testing': 'testing',
    'reference/contracts-v3': 'contracts-v3',
    'reference/contracts-v4': 'contracts-v4',
    'guides/troubleshooting': 'troubleshooting',
    'troubleshooting': 'troubleshooting',
    'guides/known-limits': 'known-limits',
    'known-limits': 'known-limits',
    'guides/signaler-vs-alternatives': 'signaler-vs-alternatives',
    'signaler-vs-alternatives': 'signaler-vs-alternatives',
    'operations/launch-checklist': 'launch-checklist',
    'launch-checklist': 'launch-checklist',
    'operations/release-playbook': 'release-playbook',
    'release-playbook': 'release-playbook',
    'operations/production-playbook': 'production-playbook',
    'production-playbook': 'production-playbook',
    'operations/performance-baseline': 'performance-baseline',
    'performance-baseline': 'performance-baseline',
    'operations/slo': 'slo',
    'slo': 'slo',
    'operations/jsr-optimization': 'jsr-optimization',
    'roadmap/active-roadmap': 'active-roadmap',
    'active-roadmap': 'active-roadmap',
    'specs/multi-benchmark-expansion': 'multi-benchmark-expansion',
    'multi-benchmark-expansion': 'multi-benchmark-expansion',
    'specs/v6-blueprint': 'v6-blueprint',
    'specs/rust-network-workers': 'rust-network-workers',
  }

  const mapped = aliasMap[normalized] || normalized.split('/').pop() || normalized
  const hash = hashPart ? `#${hashPart}` : ''
  return `/docs/signaler/${mapped}${hash}`
}

async function main() {
  await mkdir(outDir, { recursive: true })
  // Canonical source mapping.
  const files = [
    { src: 'README.md', dst: 'overview.md' },
    { src: 'guides/getting-started.md', dst: 'getting-started.md' },
    { src: 'guides/agent-quickstart.md', dst: 'agent-quickstart.md' },
    { src: 'guides/migration.md', dst: 'migration.md' },
    { src: 'guides/ai-optimized-reports.md', dst: 'ai-optimized-reports.md' },
    { src: 'guides/troubleshooting.md', dst: 'troubleshooting.md' },
    { src: 'guides/known-limits.md', dst: 'known-limits.md' },
    { src: 'guides/signaler-vs-alternatives.md', dst: 'signaler-vs-alternatives.md' },
    { src: 'reference/cli.md', dst: 'cli.md' },
    { src: 'reference/configuration.md', dst: 'configuration.md' },
    { src: 'reference/api.md', dst: 'api-reference.md' },
    { src: 'reference/features.md', dst: 'FEATURES.md' },
    { src: 'reference/testing.md', dst: 'testing.md' },
    { src: 'reference/contracts-v3.md', dst: 'contracts-v3.md' },
    { src: 'reference/contracts-v4.md', dst: 'contracts-v4.md' },
    { src: 'operations/launch-checklist.md', dst: 'launch-checklist.md' },
    { src: 'operations/release-playbook.md', dst: 'release-playbook.md' },
    { src: 'operations/production-playbook.md', dst: 'production-playbook.md' },
    { src: 'operations/performance-baseline.md', dst: 'performance-baseline.md' },
    { src: 'operations/slo.md', dst: 'slo.md' },
    { src: 'operations/jsr-optimization.md', dst: 'jsr-optimization.md' },
    { src: 'roadmap/active-roadmap.md', dst: 'active-roadmap.md' },
    { src: 'specs/multi-benchmark-expansion.md', dst: 'multi-benchmark-expansion.md' },
    { src: 'specs/v6-blueprint.md', dst: 'v6-blueprint.md' },
    { src: 'specs/rust-network-workers.md', dst: 'rust-network-workers.md' },
  ]

  const candidates = [envCliDocs, repoCliDocs, siblingCliDocs].filter(Boolean)
  let cliDocs = candidates[0]
  for (const c of candidates) { if (await pathExists(c)) { cliDocs = c; break } }

  if (!(await pathExists(cliDocs))) {
    console.log(`Skipping external docs sync. Source not found (tried): ${candidates.join(' | ')}`)
  } else {
    console.log(`Syncing CLI docs from: ${cliDocs}`)
    for (const fileDef of files) {
      const src = join(cliDocs, fileDef.src)
      const dst = join(outDir, fileDef.dst)
      await mkdir(dirname(dst), { recursive: true })
      if (!(await pathExists(src))) {
        console.log(`Warn: source file missing, skipping: ${src}`)
        continue
      }

      let content = await readFile(src, 'utf8')
      content = content.replace(/^_Canonical path:[^\n]*\n+/m, '')

      // Fix local links: [text](file.md) -> [text](/docs/signaler/file)
      content = content.replace(/\[([^\]]+)\]\(([^)]+\.md(?:#[^)]+)?)\)/g, (match, text, link) => {
        if (/^https?:\/\//i.test(link)) return match
        return `[${text}](${normalizeLinkTarget(link)})`
      })

      await writeFile(dst, content)
      console.log(`Synced & processed ${src} -> ${dst}`)
    }
  }

  // Write generated version file for the docs site from the signaler package.json.
  try {
    const cliPkgJsonPaths = [join(repoRoot, 'package.json'), join(siteRoot, 'package.json'), join(repoRoot, '..', 'package.json')]
    let version = process.env.NEXT_PUBLIC_SIGNALER_VERSION || ''
    if (!version) {
      for (const p of cliPkgJsonPaths) {
        if (await pathExists(p)) {
          const pkg = JSON.parse(await readFile(p, 'utf8'))
          if (pkg && pkg.version) { version = `v${pkg.version}`; break }
        }
      }
    }
    if (!version) version = 'v0.0.0'
    await mkdir(dirname(versionOutFile), { recursive: true })
    await writeFile(versionOutFile, JSON.stringify({ version }, null, 2))
    console.log(`Wrote site version to ${versionOutFile}: ${version}`)
  } catch (err) {
    console.warn('Failed to generate version file:', err)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })

import { cp, mkdir, access, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { constants as fsConstants } from 'node:fs'

const root = resolve(process.cwd())
// In this workspace, signaler is a sibling of docs
// In this workspace, signaler is the root, site is a child
const monorepoCliDocs = resolve(root, '..', 'docs')
const envCliDocs = process.env.CLI_DOCS_DIR ? resolve(process.env.CLI_DOCS_DIR) : null
const outDir = join(root, 'src', 'content', 'signaler')
const versionOutFile = join(root, 'src', 'lib', 'version.generated.json')

async function pathExists(p) {
  try { await access(p, fsConstants.F_OK); return true } catch { return false }
}

async function main() {
  await mkdir(outDir, { recursive: true })
  // Files available in signaler/docs
  const files = [
    'README.md',
    'getting-started.md',
    'cli-and-ci.md',
    'configuration-and-routes.md',
    'troubleshooting.md',
    'api-reference.md',
    'testing.md',
    'MIGRATION.md',
    'AI-OPTIMIZED-REPORTS.md',
    'FEATURES.md'
  ]

  const candidates = [envCliDocs, monorepoCliDocs].filter(Boolean)
  let cliDocs = candidates[0]
  for (const c of candidates) { if (await pathExists(c)) { cliDocs = c; break } }

  if (!(await pathExists(cliDocs))) {
    console.log(`Skipping external docs sync. Source not found (tried): ${candidates.join(' | ')}`)
  } else {
    console.log(`Syncing CLI docs from: ${cliDocs}`)
    for (const f of files) {
      const src = join(cliDocs, f)
      // Map some files to standard doc names if needed
      let dstName = f
      if (f === 'README.md') dstName = 'overview.md'
      if (f === 'cli-and-ci.md') dstName = 'cli.md'
      if (f === 'configuration-and-routes.md') dstName = 'configuration.md'

      const dst = join(outDir, dstName)
      await mkdir(dirname(dst), { recursive: true })
      if (!(await pathExists(src))) {
        console.log(`Warn: source file missing, skipping: ${src}`)
        continue
      }

      let content = await readFile(src, 'utf8')

      // Fix local links: [text](file.md) -> [text](/docs/signaler/file)
      content = content.replace(/\[([^\]]+)\]\(([^)]+\.md)\)/g, (match, text, link) => {
        let cleanLink = link.replace('.md', '')
        if (cleanLink === 'cli-and-ci') cleanLink = 'cli'
        if (cleanLink === 'configuration-and-routes') cleanLink = 'configuration'
        return `[${text}](/docs/signaler/${cleanLink})`
      })

      await writeFile(dst, content)
      console.log(`Synced & processed ${src} -> ${dst}`)
    }
  }

  // Write generated version file for the docs site from the signaler package.json.
  try {
    const cliPkgJsonPaths = [
      join(root, '..', 'package.json'),
      join(root, 'package.json'),
    ]
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

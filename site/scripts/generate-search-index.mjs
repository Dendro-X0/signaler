import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const siteRoot = resolve(scriptDir, '..')
const contentDir = join(siteRoot, 'src', 'content', 'signaler')
const outFile = join(siteRoot, 'public', 'search-index.json')

/** @type {Readonly<Record<string, { readonly group: string }>>} */
const PAGE_GROUPS = {
  overview: { group: 'Overview' },
  'getting-started': { group: 'Getting Started' },
  'install-matrix': { group: 'Installation' },
  installation: { group: 'Installation' },
  troubleshooting: { group: 'Installation' },
  cli: { group: 'Core' },
  configuration: { group: 'Core' },
  'agent-quickstart': { group: 'Core' },
  'folder-mode': { group: 'Core' },
  artifacts: { group: 'Core' },
  'known-limits': { group: 'Core' },
  'ai-optimized-reports': { group: 'Core' },
  migration: { group: 'Core' },
  'launch-checklist': { group: 'Operations' },
  'release-playbook': { group: 'Operations' },
  'production-playbook': { group: 'Operations' },
  'performance-baseline': { group: 'Operations' },
  slo: { group: 'Operations' },
  'active-roadmap': { group: 'Operations' },
  'jsr-optimization': { group: 'Operations' },
  'api-reference': { group: 'Reference' },
  features: { group: 'Reference' },
  testing: { group: 'Reference' },
  'contracts-v3': { group: 'Reference' },
  'contracts-v4': { group: 'Reference' },
  'signaler-vs-alternatives': { group: 'Guides' },
  'multi-benchmark-expansion': { group: 'Specs' },
  'v6-blueprint': { group: 'Specs' },
  'rust-network-workers': { group: 'Specs' },
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fileSlug(name) {
  return basename(name, '.md').toLowerCase()
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * @param {string} content
 * @param {string} slug
 */
function parseMarkdown(content, slug) {
  /** @type {Array<Record<string, unknown>>} */
  const entries = []
  const group = PAGE_GROUPS[slug]?.group ?? 'Documentation'
  const pageUrl = `/docs/signaler/${slug}`

  let pageTitle = titleFromSlug(slug)
  let sectionH2 = ''
  let currentTitle = ''
  let currentLevel = 0
  let currentId = slug
  /** @type {string[]} */
  let body = []

  const flush = () => {
    const text = stripMarkdown(body.join('\n'))
    if (!currentTitle && !text) return

    const title = currentTitle || pageTitle
    const isPage = currentLevel <= 1
    const url = isPage ? pageUrl : `${pageUrl}#${currentId}`

    entries.push({
      id: isPage ? slug : `${slug}#${currentId}`,
      title,
      pageTitle,
      group,
      section: currentLevel === 3 ? sectionH2 : null,
      url,
      content: text.slice(0, 500),
      type: isPage ? 'page' : currentLevel === 2 ? 'section' : 'subsection',
    })
    body = []
  }

  for (const line of content.split('\n')) {
    const h1 = line.match(/^# (.+)/)
    const h2 = line.match(/^## (.+)/)
    const h3 = line.match(/^### (.+)/)
    const h4 = line.match(/^#### (.+)/)

    if (h1) {
      flush()
      pageTitle = h1[1].trim()
      currentTitle = pageTitle
      currentLevel = 1
      currentId = slug
      continue
    }
    if (h2) {
      flush()
      sectionH2 = h2[1].trim()
      currentTitle = sectionH2
      currentLevel = 2
      currentId = slugify(sectionH2)
      continue
    }
    if (h3) {
      flush()
      currentTitle = h3[1].trim()
      currentLevel = 3
      currentId = slugify(currentTitle)
      continue
    }
    if (h4) {
      flush()
      currentTitle = h4[1].trim()
      currentLevel = 4
      currentId = slugify(currentTitle)
      continue
    }
    body.push(line)
  }

  flush()

  if (entries.length === 0) {
    entries.push({
      id: slug,
      title: pageTitle,
      pageTitle,
      group,
      section: null,
      url: pageUrl,
      content: stripMarkdown(content).slice(0, 500),
      type: 'page',
    })
  }

  return entries
}

async function main() {
  const names = await readdir(contentDir)
  const mdFiles = names.filter((n) => n.toLowerCase().endsWith('.md'))

  /** @type {Array<Record<string, unknown>>} */
  const documents = []

  for (const file of mdFiles.sort()) {
    const slug = fileSlug(file)
    const raw = await readFile(join(contentDir, file), 'utf8')
    documents.push(...parseMarkdown(raw, slug))
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    count: documents.length,
    documents,
  }

  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, JSON.stringify(payload))
  console.log(`Wrote ${documents.length} search entries to ${outFile}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

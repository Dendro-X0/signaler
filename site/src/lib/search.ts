export type SearchDocument = {
  readonly id: string
  readonly title: string
  readonly pageTitle: string
  readonly group: string
  readonly section: string | null
  readonly url: string
  readonly content: string
  readonly type: "page" | "section" | "subsection"
}

export type SearchIndexPayload = {
  readonly generatedAt: string
  readonly count: number
  readonly documents: readonly SearchDocument[]
}

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim()

export function withBasePath(url: string): string {
  if (!BASE_PATH) return url
  return `${BASE_PATH}${url}`
}

export function searchIndexUrl(): string {
  return withBasePath("/search-index.json")
}

let cachedIndex: SearchIndexPayload | null = null

const SUGGESTED_PAGE_IDS = [
  "overview",
  "getting-started",
  "install-matrix",
  "installation",
  "cli",
  "configuration",
  "agent-quickstart",
  "troubleshooting",
] as const

export async function loadSearchIndex(): Promise<SearchIndexPayload> {
  if (cachedIndex) return cachedIndex
  const res = await fetch(searchIndexUrl())
  if (!res.ok) throw new Error(`search index fetch failed: ${res.status}`)
  cachedIndex = (await res.json()) as SearchIndexPayload
  return cachedIndex
}

function scoreDocument(doc: SearchDocument, terms: readonly string[]): number {
  const title = doc.title.toLowerCase()
  const page = doc.pageTitle.toLowerCase()
  const group = doc.group.toLowerCase()
  const section = (doc.section ?? "").toLowerCase()
  const body = doc.content.toLowerCase()
  const phrase = terms.join(" ")

  let score = 0

  if (title.includes(phrase)) score += 120
  if (page.includes(phrase)) score += 80
  if (title.startsWith(terms[0] ?? "")) score += 40
  if (page.startsWith(terms[0] ?? "")) score += 25

  for (const term of terms) {
    if (!term) continue
    if (title === term) score += 100
    else if (title.includes(term)) score += 35
    if (page.includes(term)) score += 20
    if (group.includes(term)) score += 15
    if (section.includes(term)) score += 12
    if (body.includes(term)) score += 8
    if (doc.type === "page" && page.split(" ").some((w) => w.startsWith(term))) {
      score += 10
    }
  }

  return score
}

export async function searchDocs(
  query: string,
  limit = 12,
): Promise<readonly SearchDocument[]> {
  const q = query.trim().toLowerCase()
  const index = await loadSearchIndex()

  if (!q) {
    const pages = new Map(
      index.documents.filter((d) => d.type === "page").map((d) => [d.id, d]),
    )
    return SUGGESTED_PAGE_IDS.map((id) => pages.get(id))
      .filter((d): d is SearchDocument => Boolean(d))
      .slice(0, limit)
  }

  const terms = q.split(/\s+/).filter(Boolean)

  const ranked = index.documents
    .map((doc) => ({ doc, score: scoreDocument(doc, terms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title))

  const seen = new Set<string>()
  const out: SearchDocument[] = []

  for (const { doc } of ranked) {
    if (seen.has(doc.id)) continue
    seen.add(doc.id)
    out.push(doc)
    if (out.length >= limit) break
  }

  return out
}

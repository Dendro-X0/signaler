"use client"

import React, { useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Hash, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  searchDocs,
  withBasePath,
  type SearchDocument,
} from "@/lib/search"

function ResultIcon({ type }: { readonly type: SearchDocument["type"] }) {
  if (type === "page") return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
  return <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
}

function resultLabel(doc: SearchDocument): string {
  if (doc.type === "page") return doc.pageTitle
  return doc.title
}

function resultMeta(doc: SearchDocument): string {
  if (doc.type === "page") return doc.group
  if (doc.section) return `${doc.group} · ${doc.pageTitle} · ${doc.section}`
  return `${doc.group} · ${doc.pageTitle}`
}

export function DocsSearch(): React.ReactElement {
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<readonly SearchDocument[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setResults([])
    setActiveIndex(0)
  }, [])

  const navigate = useCallback(
    (doc: SearchDocument) => {
      close()
      router.push(withBasePath(doc.url))
    },
    [close, router],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [close])

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const hits = await searchDocs(query)
        if (!cancelled) {
          setResults(hits)
          setActiveIndex(0)
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const timer = window.setTimeout(run, query ? 120 : 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault()
      navigate(results[activeIndex])
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="sm:hidden h-9 px-3"
          onClick={() => setOpen(true)}
          aria-label="Search documentation"
        >
          <Search className="h-4 w-4" />
        </Button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative hidden sm:flex max-w-sm w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground shadow-xs hover:bg-accent/40 transition-colors"
          aria-label="Search documentation"
        >
          <Search className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1 text-left truncate">Search documentation…</span>
          <kbd className="pointer-events-none hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:pt-[12vh]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            aria-label="Close search"
            onClick={close}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search documentation"
            className="relative z-[101] w-full max-w-2xl overflow-hidden rounded-xl border bg-background shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search pages and sections…"
                className="border-0 shadow-none focus-visible:ring-0 h-12"
                aria-controls={listboxId}
                aria-expanded={results.length > 0}
                aria-autocomplete="list"
                role="combobox"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={close}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
              {loading && (
                <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                  Searching…
                </p>
              )}

              {!loading && query && results.length === 0 && (
                <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                  No results for &ldquo;{query}&rdquo;
                </p>
              )}

              {!loading && !query && results.length > 0 && (
                <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Popular pages
                </p>
              )}

              {!loading && !query && (
                <p className="px-3 pb-2 text-sm text-muted-foreground">
                  Or search:{" "}
                  <span className="font-mono text-foreground">lab auth</span>,{" "}
                  <span className="font-mono text-foreground">quality profile</span>,{" "}
                  <span className="font-mono text-foreground">incremental skip</span>
                </p>
              )}

              <ul id={listboxId} role="listbox" className="space-y-1">
                {results.map((doc, index) => (
                  <li key={doc.id} role="option" aria-selected={index === activeIndex}>
                    <Link
                      href={withBasePath(doc.url)}
                      onClick={(e) => {
                        e.preventDefault()
                        navigate(doc)
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        index === activeIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/60",
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <ResultIcon type={doc.type} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{resultLabel(doc)}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {resultMeta(doc)}
                        </div>
                        {doc.content && doc.type !== "page" && (
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {doc.content}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
              <span>↑↓ navigate · Enter open · Esc close</span>
              <span>{results.length > 0 ? `${results.length} results` : ""}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

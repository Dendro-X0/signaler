"use client"

import React, { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type DemoTab = "init" | "audit" | "artifacts" | "dashboard"

const TABS: ReadonlyArray<{ readonly id: DemoTab; readonly label: string }> = [
  { id: "init", label: "Init" },
  { id: "audit", label: "Audit" },
  { id: "artifacts", label: "Artifacts" },
  { id: "dashboard", label: "HTML Report" },
]

const GIF_BASE =
  "https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets"

export function DemoSection() {
  const [active, setActive] = useState<DemoTab>("init")

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">See Signaler in Action</h2>
          <p className="text-lg text-muted-foreground">
            CLI workflow, agent artifacts, and the interactive HTML dashboard at{" "}
            <code className="text-sm">developer/report.html</code>.
          </p>
        </div>

        <div className="w-full">
          <div className="flex justify-center mb-8">
            <div
              className="grid w-full max-w-2xl grid-cols-4 rounded-lg bg-muted p-[3px] text-muted-foreground"
              role="tablist"
              aria-label="Signaler demo clips"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active === tab.id}
                  onClick={() => setActive(tab.id)}
                  className={cn(
                    "inline-flex h-9 flex-1 items-center justify-center rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow]",
                    active === tab.id
                      ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
                      : "text-foreground dark:text-muted-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {active === "init" && (
            <div role="tabpanel">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                <Image
                  src={`${GIF_BASE}/init.gif`}
                  alt="Signaler init demo"
                  width={1200}
                  height={675}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <p className="text-center mt-4 text-sm text-muted-foreground">
                Initialize a project with `signaler discover`
              </p>
            </div>
          )}

          {active === "audit" && (
            <div role="tabpanel">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                <Image
                  src={`${GIF_BASE}/audit.gif`}
                  alt="Signaler audit demo"
                  width={1200}
                  height={675}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <p className="text-center mt-4 text-sm text-muted-foreground">
                One command: discover → run → analyze with `signaler audit`
              </p>
            </div>
          )}

          {active === "artifacts" && (
            <div role="tabpanel">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                <Image
                  src={`${GIF_BASE}/artifacts.gif`}
                  alt="Signaler artifacts demo"
                  width={1200}
                  height={675}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <p className="text-center mt-4 text-sm text-muted-foreground">
                Tree layout artifacts under `.signaler/` (start at `INDEX.md`)
              </p>
            </div>
          )}

          {active === "dashboard" && (
            <div role="tabpanel">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                <Image
                  src={`${GIF_BASE}/analytics_dashboard.gif`}
                  alt="Signaler HTML dashboard report demo"
                  width={1200}
                  height={675}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <p className="text-center mt-4 text-sm text-muted-foreground">
                Interactive HTML report: KPI strip, issue-count triage, and category scores
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

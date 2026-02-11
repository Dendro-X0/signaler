"use client"

import React, { useState } from "react"
import { Copy, Check, Terminal } from "lucide-react"

export function HeroStartCommand(): React.ReactElement {
  const [copied, setCopied] = useState<boolean>(false)
  const cmd: string = "npx jsr run @signaler/cli wizard"

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(cmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="group relative flex items-center gap-3 rounded-xl border border-gray-200 bg-white/70 px-5 py-3 text-base font-mono text-gray-900 shadow-md backdrop-blur-md hover:bg-white dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-100 dark:hover:bg-gray-900 transition-all duration-300 hover:shadow-blue-500/20"
        aria-label={`Copy: ${cmd}`}
      >
        <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors -z-10" />
        <Terminal className="h-5 w-5 text-gray-600 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
        <span className="select-none">{cmd}</span>
        <span className="ml-2 rounded-md border px-2 py-0.5 text-xs text-gray-600 group-hover:border-blue-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 dark:group-hover:border-blue-400">
          {copied ? (
            <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Copied</span>
          ) : (
            <span className="inline-flex items-center gap-1"><Copy className="h-3.5 w-3.5" /> Copy</span>
          )}
        </span>
      </button>
      <p className="text-sm text-muted-foreground max-w-2xl text-center">
        Verifies your environment (Node + supported browser) so the launcher can orchestrate engine runs.
      </p>
    </div>
  )
}

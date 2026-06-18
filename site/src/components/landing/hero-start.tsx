"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Copy, Check, Terminal } from "lucide-react"
import { INSTALL_COMMANDS, type InstallShell } from "@/lib/install-commands"
import { ShellTabBar } from "@/components/landing/shell-tab-bar"

export function HeroStartCommand(): React.ReactElement {
  const [shell, setShell] = useState<InstallShell>("bash")
  const [copied, setCopied] = useState<boolean>(false)
  const cmd = INSTALL_COMMANDS[shell]

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
    <div className="flex flex-col items-center gap-3 max-w-2xl mx-auto">
      <ShellTabBar active={shell} onChange={setShell} />
      <button
        type="button"
        onClick={copy}
        className="group relative flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white/70 px-5 py-3 text-base font-mono text-gray-900 shadow-md backdrop-blur-md hover:bg-white dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-100 dark:hover:bg-gray-900 transition-all duration-300 hover:shadow-blue-500/20"
        aria-label={`Copy install command: ${cmd}`}
      >
        <div className="absolute inset-0 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors -z-10" />
        <Terminal className="h-5 w-5 shrink-0 text-gray-600 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400" />
        <span className="select-none text-left text-sm sm:text-base break-all">{cmd}</span>
        <span className="ml-auto shrink-0 rounded-md border px-2 py-0.5 text-xs text-gray-600 group-hover:border-blue-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 dark:group-hover:border-blue-400">
          {copied ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Copied
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Copy className="h-3.5 w-3.5" /> Copy
            </span>
          )}
        </span>
      </button>
      <p className="text-sm text-muted-foreground text-center">
        Installs <strong>latest</strong> from GitHub Releases (Node 18+). First install: 5–15 min.{" "}
        <Link href="/docs/signaler/install-matrix" className="underline hover:text-foreground">
          Install matrix
        </Link>{" "}
        for all platforms.
      </p>
    </div>
  )
}

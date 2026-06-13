"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

type Cmd = { readonly key: string; readonly label: string; readonly code: string }
type Shell = "bash" | "powershell"

const INSTALL_BASH =
  "curl -fsSL https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh | bash"

const INSTALL_PS =
  "irm https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1 | iex"

export function SignalerQuickStart(): React.ReactElement {
  const [copiedKey, setCopiedKey] = useState<string>("")
  const [shell, setShell] = useState<Shell>("bash")

  const installCmd = shell === "bash" ? INSTALL_BASH : INSTALL_PS

  const commands: ReadonlyArray<Cmd> = [
    { key: "install", label: "# 1. Install latest (GitHub Release)", code: installCmd },
    { key: "version", label: "# 2. Verify", code: "signaler --version" },
    {
      key: "audit",
      label: "# 3. Audit your app",
      code: "signaler audit --cwd . --base-url http://127.0.0.1:3000",
    },
    {
      key: "query",
      label: "# 4. Agent triage",
      code: "signaler query --view perf --dir .signaler",
    },
  ]

  const all: string = commands.map((c) => `${c.label}\n${c.code}`).join("\n\n") + "\n"

  async function copy(text: string, key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(""), 1500)
    } catch {
      setCopiedKey("")
    }
  }

  return (
    <div className="relative max-w-4xl mx-auto mt-16">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-3xl -z-10" />
      <div className="text-left rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50/80 text-gray-900 dark:bg-gray-950/60 backdrop-blur-md dark:text-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 flex items-center justify-between gap-2" aria-live="polite">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Signaler Quick Start</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-4">
              {(["bash", "powershell"] as Shell[]).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={shell === s ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShell(s)}
                  aria-pressed={shell === s}
                >
                  {s === "bash" ? "Bash / Git Bash" : "PowerShell"}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={async () => copy(all, "all")}
              aria-label="Copy all commands"
            >
              {copiedKey === "all" ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> Copy All
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="p-6 font-mono text-sm leading-7 space-y-4">
          <div className="text-xs text-muted-foreground pb-2">
            // Latest release from GitHub — not npm/JSR. First install: 5–15 min. Pin with SIGNALER_VERSION for CI.
          </div>

          {commands.map((c) => (
            <div key={c.key} className="flex items-start justify-between gap-3 group">
              <div
                role="button"
                tabIndex={0}
                onClick={async () => copy(c.code, c.key)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    await copy(c.code, c.key)
                  }
                }}
                className="flex-1 cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="text-gray-500 dark:text-gray-400 mb-1">{c.label}</div>
                <div className="whitespace-pre-wrap break-all text-gray-900 dark:text-gray-100">{c.code}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={async () => copy(c.code, c.key)}
                aria-label={`Copy ${c.key}`}
              >
                {copiedKey === c.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

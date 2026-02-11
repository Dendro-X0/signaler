"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

type Cmd = { readonly key: string; readonly label: string; readonly code: string }
type Manager = "npm" | "pnpm" | "yarn" | "bun"
type InstallMode = "npx" | "global"

function execPrefix(m: Manager): string {
    if (m === "pnpm") return "pnpm dlx jsr run @signaler/cli"
    if (m === "yarn") return "yarn dlx jsr run @signaler/cli"
    if (m === "bun") return "bunx jsr run @signaler/cli"
    return "npx jsr run @signaler/cli" // npm
}

export function SignalerQuickStart(): React.ReactElement {
    const [copiedKey, setCopiedKey] = useState<string>("")
    const [mgr, setMgr] = useState<Manager>("npm")
    const [mode, setMode] = useState<InstallMode>("npx")

    const x = execPrefix(mgr)

    // Signaler commands
    const commands: ReadonlyArray<Cmd> = [
        { key: "wizard", label: "# 1. Interactive Setup", code: `${x} wizard` },
        { key: "audit", label: "# 2. Run Full Audit", code: `${x} audit` },
        { key: "focus", label: "# Focus on worst pages", code: `${x} audit --focus-worst 5` },
        { key: "ci", label: "# CI Mode (Fail on budget)", code: `${x} audit --ci --fail-on-budget` },
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
                            {(["npm", "pnpm", "yarn", "bun"] as Manager[]).map((m) => (
                                <Button
                                    key={m}
                                    type="button"
                                    variant={mgr === m ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setMgr(m)}
                                    aria-pressed={mgr === m}
                                >{m}</Button>
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
            // Run without installation using {mgr === "npm" ? "npx" : mgr === "pnpm" ? "pnpm dlx" : mgr === "yarn" ? "yarn dlx" : "bunx"}
                    </div>

                    {commands.map((c) => (
                        <div key={c.key} className="flex items-start justify-between gap-3 group">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={async () => copy(c.code, c.key)}
                                onKeyDown={async (e) => { if (e.key === "Enter" || e.key === " ") { await copy(c.code, c.key) } }}
                                className="rounded-md px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors w-full"
                                aria-label={`Copy: ${c.code}`}
                            >
                                <div className="text-gray-500 dark:text-gray-500 select-none mb-1">{c.label}</div>
                                <div className="text-blue-700 dark:text-blue-400 break-all font-semibold">{c.code}</div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={async () => copy(c.code, c.key)}
                                aria-label={`Copy ${c.key}`}
                            >
                                {copiedKey === c.key ? (<Check className="h-4 w-4" />) : (<Copy className="h-4 w-4" />)}
                            </Button>
                        </div>
                    ))}
                    <div className="text-xs text-muted-foreground pt-2 border-t border-dashed border-gray-200 dark:border-gray-800 mt-4">
             // Requires Node.js 18+
                    </div>
                </div>
            </div>
        </div>
    )
}

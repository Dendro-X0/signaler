"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { INSTALL_SHELLS, type InstallShell } from "@/lib/install-commands"

type ShellTabBarProps = {
  readonly active: InstallShell
  readonly onChange: (shell: InstallShell) => void
  readonly className?: string
  readonly "aria-label"?: string
}

export function ShellTabBar({
  active,
  onChange,
  className,
  "aria-label": ariaLabel = "Install shell",
}: ShellTabBarProps): React.ReactElement {
  return (
    <div
      className={cn(
        "inline-grid grid-cols-2 rounded-lg bg-muted p-[3px] text-muted-foreground",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {INSTALL_SHELLS.map((shell) => (
        <button
          key={shell.id}
          type="button"
          role="tab"
          aria-selected={active === shell.id}
          onClick={() => onChange(shell.id)}
          className={cn(
            "inline-flex h-8 items-center justify-center rounded-md border border-transparent px-3 py-1 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] sm:text-sm",
            active === shell.id
              ? "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30"
              : "text-foreground dark:text-muted-foreground",
          )}
        >
          {shell.label}
        </button>
      ))}
    </div>
  )
}

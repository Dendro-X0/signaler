import type { LucideIcon } from "lucide-react"
import { Home, Rocket, Terminal, Cloud, Code, FileText } from "lucide-react"

export type NavLeaf = { title: string; url: string }
export type NavSubGroup = { title: string; items: readonly NavLeaf[] }
export type NavLink = { title: string; icon: LucideIcon; url: string }
export type NavGroup = { title: string; icon: LucideIcon; items: readonly (NavLeaf | NavSubGroup)[] }
export type NavItem = NavLink | NavGroup

export const navigationItems: ReadonlyArray<NavItem> = [
  {
    title: "Overview",
    icon: Home,
    url: "/docs/signaler/overview",
  },
  {
    title: "Getting Started",
    icon: Rocket,
    url: "/docs/signaler/getting-started",
  },
  {
    title: "Core",
    icon: Terminal,
    items: [
      { title: "CLI Reference", url: "/docs/signaler/cli" },
      { title: "Configuration", url: "/docs/signaler/configuration" },
      { title: "Agent Quickstart", url: "/docs/signaler/agent-quickstart" },
      { title: "Folder Mode", url: "/docs/signaler/folder-mode" },
      { title: "Artifacts", url: "/docs/signaler/artifacts" },
      { title: "Known Limits", url: "/docs/signaler/known-limits" },
      { title: "AI Reports", url: "/docs/signaler/ai-optimized-reports" },
      { title: "Migration", url: "/docs/signaler/migration" },
      {
        title: "Operations",
        items: [
          { title: "Launch Checklist", url: "/docs/signaler/launch-checklist" },
          { title: "Release Playbook", url: "/docs/signaler/release-playbook" },
          { title: "Production Playbook", url: "/docs/signaler/production-playbook" },
          { title: "Performance Baseline", url: "/docs/signaler/performance-baseline" },
          { title: "SLO", url: "/docs/signaler/slo" },
          { title: "Active Roadmap", url: "/docs/signaler/active-roadmap" },
        ],
      },
    ],
  },
] as const

export type ResourceItem = { title: string; url: string; icon: LucideIcon; badge?: string }
export const resourceItems: ReadonlyArray<ResourceItem> = [
  { title: "Changelog", url: "https://github.com/Dendro-X0/signaler/releases", icon: FileText, badge: "New" },
  { title: "GitHub", url: "https://github.com/Dendro-X0/signaler", icon: Code },
] as const

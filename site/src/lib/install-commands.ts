export type InstallShell = "bash" | "powershell"

export const INSTALL_SHELLS: ReadonlyArray<{
  readonly id: InstallShell
  readonly label: string
}> = [
  { id: "bash", label: "Bash / Git Bash" },
  { id: "powershell", label: "PowerShell" },
]

const INSTALL_SH_URL =
  "https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.sh"
const INSTALL_PS1_URL =
  "https://raw.githubusercontent.com/Dendro-X0/signaler/main/release-assets/install.ps1"

/** One-line install for hero / copy buttons */
export const INSTALL_COMMANDS: Readonly<Record<InstallShell, string>> = {
  bash: `curl -fsSL ${INSTALL_SH_URL} | bash`,
  powershell: `irm ${INSTALL_PS1_URL} | iex`,
}

/** Install block for quick-start (includes reload hint on Bash) */
export const INSTALL_QUICK_START: Readonly<Record<InstallShell, string>> = {
  bash: `${INSTALL_COMMANDS.bash}\nsource ~/.bashrc`,
  powershell: INSTALL_COMMANDS.powershell,
}

const warnedAliases = new Set<string>();

/** One stderr warning per alias key per process (v5.2.1 sunset messaging). */
export function warnCompatibilityAlias(key: string, message: string): void {
  if (warnedAliases.has(key)) {
    return;
  }
  warnedAliases.add(key);
  // eslint-disable-next-line no-console
  console.warn(message);
}

export function resetCompatibilityAliasWarningsForTests(): void {
  warnedAliases.clear();
}

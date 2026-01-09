<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { goto } from '$app/navigation';

  type HistoryEntry = {
    readonly id: string;
    readonly createdAt: string;
    readonly mode: string;
    readonly target: string;
    readonly outputDir: string;
  };

  let entries: readonly HistoryEntry[] = [];

  const refresh = async (): Promise<void> => {
    entries = await invoke<readonly HistoryEntry[]>('list_history');
  };

  const open = (entry: HistoryEntry): void => {
    goto(`/results?outputDir=${encodeURIComponent(entry.outputDir)}`);
  };

  onMount(() => {
    refresh();
  });
</script>

<h1>History</h1>

<div style="display:flex; gap: 8px; margin-bottom: 12px;">
  <button on:click={refresh}>Refresh</button>
  <a href="/">New run</a>
</div>

{#if entries.length === 0}
  <p>No runs yet.</p>
{:else}
  <ul style="display:grid; gap: 8px; padding-left: 16px;">
    {#each entries as e}
      <li>
        <button on:click={() => open(e)} style="text-align:left;">
          {e.createdAt} — {e.mode} — {e.target}
        </button>
      </li>
    {/each}
  </ul>
{/if}

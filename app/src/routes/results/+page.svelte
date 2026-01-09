<script lang="ts">
  import { page } from '$app/stores';
  import { invoke } from '@tauri-apps/api/core';

  let outputDir: string = '';

  $: {
    outputDir = $page.url.searchParams.get('outputDir') ?? '';
  }

  const openOutputDir = async (): Promise<void> => {
    if (outputDir.length === 0) return;
    await invoke<void>('open_path', { path: outputDir });
  };

  const openReport = async (): Promise<void> => {
    if (outputDir.length === 0) return;
    await invoke<void>('open_report', { outputDir });
  };
</script>

<h1>Results</h1>
<p><strong>Output:</strong> {outputDir}</p>

<div style="display:flex; gap: 8px;">
  <button on:click={openReport} disabled={outputDir.length === 0}>Open report.html</button>
  <button on:click={openOutputDir} disabled={outputDir.length === 0}>Open output directory</button>
  <a href="/history">History</a>
  <a href="/">New run</a>
</div>

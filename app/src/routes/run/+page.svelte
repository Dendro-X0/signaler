<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { invoke } from '@tauri-apps/api/core';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { goto } from '$app/navigation';
  import type { EngineEventPayload } from '$lib/engine-event-payload';

  type RunMode = 'url' | 'folder';

  type UiEvent = unknown;

  let mode: RunMode = 'url';
  let value: string = '';
  let running: boolean = false;
  let logLines: string[] = [];
  let outputDir: string | undefined;
  let unlisten: UnlistenFn | undefined;
  let completed: number = 0;
  let total: number = 0;
  let currentPath: string = '';
  let currentDevice: string = '';
  let etaMs: number | undefined;
  let started: boolean = false;
  let finished: boolean = false;

  const pushLog = (line: string): void => {
    logLines = [...logLines, line].slice(-500);
  };

  const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
  };

  const isEngineEventPayload = (value: unknown): value is EngineEventPayload => {
    if (!isRecord(value)) return false;
    return typeof value.type === 'string' && typeof value.ts === 'string';
  };

  const formatEta = (valueMs: number): string => {
    const seconds = Math.max(0, Math.floor(valueMs / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainderSeconds = seconds % 60;
    if (minutes <= 0) return `${remainderSeconds}s`;
    return `${minutes}m ${remainderSeconds}s`;
  };

  const applyEngineEvent = (event: EngineEventPayload): void => {
    if (event.type === 'run_started') {
      started = true;
      finished = false;
      if (event.outputDir) outputDir = event.outputDir;
      return;
    }
    if (event.type === 'progress') {
      completed = event.completed;
      total = event.total;
      currentPath = event.path;
      currentDevice = event.device;
      etaMs = event.etaMs;
      return;
    }
    if (event.type === 'run_completed') {
      finished = true;
      running = false;
      if (event.outputDir) outputDir = event.outputDir;
    }
  };

  const start = async (): Promise<void> => {
    if (running) return;
    running = true;
    pushLog('Starting...');
    const result = await invoke<{ readonly outputDir: string }>('start_run', { mode, value });
    outputDir = result.outputDir;
  };

  const cancel = async (): Promise<void> => {
    if (!running) return;
    await invoke<void>('cancel_run');
    pushLog('Cancel requested.');
  };

  onMount(async () => {
    const params = $page.url.searchParams;
    const modeParam = params.get('mode');
    const valueParam = params.get('value');
    if (modeParam === 'folder') mode = 'folder';
    value = valueParam ?? '';
    unlisten = await listen<UiEvent>('engine_event', (event: { readonly payload?: unknown }) => {
      const payload: unknown = event.payload;
      if (isEngineEventPayload(payload)) {
        applyEngineEvent(payload);
        if (payload.type === 'progress') {
          const etaText = payload.etaMs === undefined ? '' : ` ETA ${formatEta(payload.etaMs)}`;
          pushLog(`progress ${payload.completed}/${payload.total} ${payload.path} [${payload.device}]${etaText}`);
        } else {
          pushLog(JSON.stringify(payload));
        }
        return;
      }
      if (typeof payload === 'string') {
        pushLog(payload);
        return;
      }
      pushLog(JSON.stringify(payload));
    });
    await start();
  });

  onDestroy(() => {
    unlisten?.();
  });

  const goToResults = (): void => {
    if (!outputDir) return;
    goto(`/results?outputDir=${encodeURIComponent(outputDir)}`);
  };
</script>

<h1>Run</h1>
<p><strong>Mode:</strong> {mode}</p>
<p><strong>Target:</strong> {value}</p>

<h2>Status</h2>
<p><strong>Started:</strong> {started ? 'yes' : 'no'}</p>
<p><strong>Finished:</strong> {finished ? 'yes' : 'no'}</p>

<h2>Progress</h2>
<p><strong>Completed:</strong> {completed}/{total}</p>
<p><strong>Current:</strong> {currentPath} [{currentDevice}]</p>
<p><strong>ETA:</strong> {etaMs === undefined ? '—' : formatEta(etaMs)}</p>

<div style="display:flex; gap: 8px; margin: 12px 0;">
  <button on:click={cancel} disabled={!running}>Cancel</button>
  <button on:click={goToResults} disabled={running || !outputDir}>View results</button>
  <a href="/">Back</a>
</div>

<h2>Log</h2>
<pre style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; max-height: 420px; overflow: auto;">{logLines.join('\n')}</pre>

<script lang="ts">
  import { goto } from '$app/navigation';
  let url: string = '';
  let folder: string = '';
  const onStartUrl = (): void => {
    if (url.trim().length === 0) return;
    goto(`/run?mode=url&value=${encodeURIComponent(url.trim())}`);
  };
  const onStartFolder = (): void => {
    if (folder.trim().length === 0) return;
    goto(`/run?mode=folder&value=${encodeURIComponent(folder.trim())}`);
  };
</script>

<h1>Signaler</h1>
<p>Start a run.</p>

<section style="display: grid; gap: 16px;">
  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
    <h2>URL mode</h2>
    <input bind:value={url} placeholder="https://example.com" style="width: 100%; padding: 8px;" />
    <div style="margin-top: 8px;">
      <button on:click={onStartUrl}>Run URL audit</button>
    </div>
  </div>

  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;">
    <h2>Folder mode</h2>
    <input bind:value={folder} placeholder="C:\\path\\to\\site" style="width: 100%; padding: 8px;" />
    <div style="margin-top: 8px;">
      <button on:click={onStartFolder}>Run folder audit</button>
    </div>
  </div>

  <div style="display:flex; gap: 8px;">
    <a href="/history">History</a>
  </div>
</section>

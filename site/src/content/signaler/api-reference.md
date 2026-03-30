# API Reference

This page documents the current programmatic entrypoint exported by `@signaler/cli/api`.

## Install

```bash
npx jsr add @signaler/cli
```

## Import

```ts
import { createSignalerAPI } from '@signaler/cli/api';
```

## Create API Instance

```ts
const api = createSignalerAPI();
```

## Interface

The instance returned by `createSignalerAPI()` exposes:

- `audit(config)`
- `createConfig(options)`
- `validateConfig(config)`
- `getVersion()`

## Basic Example

```ts
import { createSignalerAPI } from '@signaler/cli/api';

const api = createSignalerAPI();

const config = api.createConfig({
  baseUrl: 'http://localhost:3000',
  pages: [{ path: '/', label: 'Home', devices: ['mobile', 'desktop'] }],
});

const check = api.validateConfig(config);
if (!check.valid) {
  throw new Error(check.errors.join('\n'));
}

const result = await api.audit(config);
console.log(result.meta.completedAt);
```

## `AuditConfig` (programmatic)

The current API implementation expects this shape:

```ts
interface AuditConfig {
  baseUrl: string;
  pages: {
    path: string;
    label: string;
    devices: ('mobile' | 'desktop')[];
    scope?: 'public' | 'requires-auth';
  }[];
  runners: { name: string; [key: string]: unknown }[];
  output: {
    directory: string;
    formats: ('html' | 'json' | 'markdown')[];
    artifacts: boolean;
  };
  parallel?: number;
  timeout?: number;
}
```

## `createConfig` defaults

`createConfig(options)` applies defaults for missing fields:

- `baseUrl`: `http://localhost:3000`
- `pages`: one `/` page (mobile + desktop)
- `runners`: `[{ name: 'lighthouse' }]`
- `output.directory`: `./signaler-output`
- `output.formats`: `['html', 'json']`
- `output.artifacts`: `true`
- `parallel`: `1`
- `timeout`: `30000`

## Convenience Functions

`@signaler/cli/api` also exports:

- `audit(config)`
- `createConfig(options?)`
- `validateConfig(config)`
- `getVersion()`

These internally create an API instance and call the same methods.

## CLI vs API Note

The CLI (`signaler audit`) uses `signaler.config.json` and the CLI config model.
The programmatic API currently uses the runner-oriented `AuditConfig` shown above.

## Support

- Issues: <https://github.com/Dendro-X0/signaler/issues>
- CLI docs: [cli.md](/docs/signaler/cli)
- Config docs: [configuration.md](/docs/signaler/configuration)


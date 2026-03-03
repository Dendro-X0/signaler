# Framework Integration Examples

Current integration patterns by framework.

## Next.js

```bash
pnpm build
pnpm start
signaler wizard
signaler audit
```

## Nuxt

```bash
pnpm build
pnpm preview
signaler wizard
signaler audit
```

## Remix

```bash
pnpm build
pnpm start
signaler wizard
signaler audit
```

## SvelteKit

```bash
pnpm build
pnpm preview
signaler wizard
signaler audit
```

## Static Site

```bash
signaler folder --root ./dist
```

## Programmatic API in App Code

```ts
import { createSignalerAPI } from '@signaler/cli/api';

const api = createSignalerAPI();
const config = api.createConfig({
  baseUrl: 'http://localhost:3000',
  pages: [{ path: '/', label: 'Home', devices: ['mobile'] }],
});

const result = await api.audit(config);
console.log(result.results.length);
```

## CI Example

```yaml
- run: npx jsr add @signaler/cli
- run: signaler audit --ci --fail-on-budget --no-color
```

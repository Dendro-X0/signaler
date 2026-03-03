# Advanced Usage Examples

Advanced, current examples for automation and scripting.

## Audit Planning Before Execution

```bash
signaler audit --plan --config ./signaler.config.json
```

## Diagnostics and LHR Capture

```bash
signaler audit --diagnostics
signaler audit --lhr
```

## Stability and Throughput Tuning

```bash
signaler audit --stable
signaler audit --parallel 4
signaler audit --audit-timeout-ms 90000
```

## Incremental Run

```bash
signaler audit --incremental --build-id "$GIT_COMMIT"
```

## Scripted Node Usage

```ts
import { spawn } from 'node:child_process';

const child = spawn('signaler', ['audit', '--ci', '--fail-on-budget', '--no-color'], {
  stdio: 'inherit',
});

child.on('close', (code) => process.exit(code ?? 1));
```

## Cortex Entry

```bash
signaler cortex
```

# CLI Usage Examples

Source-of-truth command examples for the current CLI.

## Audit

```bash
signaler audit
signaler audit --config ./signaler.config.json
signaler audit --ci --fail-on-budget --no-color
signaler audit --focus-worst 10
signaler audit --mobile-only
signaler audit --desktop-only
signaler audit --plan
```

## Measure

```bash
signaler measure
signaler measure --parallel 4
signaler measure --timeout-ms 45000
```

## Other Checks

```bash
signaler bundle --project-root .
signaler health --config ./signaler.config.json
signaler links --config ./signaler.config.json
signaler headers --config ./signaler.config.json
signaler console --config ./signaler.config.json
```

## Folder Mode

```bash
signaler folder --root ./dist
```

## Wizard and Shell

```bash
signaler wizard
signaler shell
```

## Config Management

```bash
signaler config --init
signaler config --validate --output ./signaler.config.json
```

## Maintenance

```bash
signaler clean --yes
signaler clear-screenshots --yes
```

# Real Project Comparison (Node vs SIGNALER_RUST_NETWORK=1)

Generated: 2026-03-06T01:54:50.859Z

| Command | Node elapsed(ms) | Rust elapsed(ms) | Delta(ms) | Delta(%) | Node errors | Rust errors | Node engine | Rust engine | Rust used |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| health | 2285 | 2296 | 11 | 0.5% | 0/34 | 0/34 | node | node | false |
| headers | 2321 | 2348 | 27 | 1.2% | 34/34 | 34/34 | node | node | false |
| links | 6960 | 6628 | -332 | -4.8% | 10/70 | 10/70 | node | node | false |
| console | 8868 | 8247 | -621 | -7% | 7/68 | 3/68 | node | node | false |

## Rust fallback notes
- health: spawn cargo.exe ENOENT
- headers: spawn cargo.exe ENOENT
- links: spawn cargo.exe ENOENT
- console: spawn cargo.exe ENOENT

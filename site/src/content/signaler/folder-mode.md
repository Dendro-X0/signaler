# Folder Mode

Folder mode allows you to audit a static site export directly from your local filesystem. This is perfect for pre-deployment checks of static site generators (SSG) output or single-page applications (SPA).

## Usage

```bash
npx signaler folder ./dist
```

Where `./dist` is the path to your static build output.

## Features

-   **Static Server**: Signaler spins up a local static file server to serve your directory.
-   **Auto-Discovery**: Crawls the directory to find HTML files and treats them as routes.
-   **SPA Support**: Configurable fallback for Single Page Applications.

## Configuration

You can configure folder mode via flags or `signaler.config.json` (if present in the folder root):

-   `--spa`: Enable SPA fallback (serve `index.html` for unknown routes).
-   `--port <n>`: Specify a port for the static server.

# Troubleshooting Guide

This guide helps resolve common issues when using Signaler for web performance auditing.

## Installation Issues

### Command Not Found After Installation

**Problem:** `signaler: command not found` after installation.

**Solutions:**

1. **Restart your terminal** to refresh PATH variables
2. **Check installation location:**
   ```bash
   # On Windows
   $env:LOCALAPPDATA\signaler\signaler.cmd --version
   
   # On Unix/macOS
   ~/.local/bin/signaler --version
   ```
3. **Verify Node.js installation:**
   ```bash
   node --version  # Should be 18.0.0 or higher
   npm --version
   ```
4. **Reinstall globally:**
   ```bash
   npm uninstall -g @signaler/cli
   npm install -g @signaler/cli
   ```

### Permission Errors on Unix/macOS

**Problem:** `EACCES` permission errors during installation.

**Solutions:**

1. **Use sudo (not recommended):**
   ```bash
   sudo npm install -g @signaler/cli
   ```

2. **Use Node Version Manager (recommended):**
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Install and use latest Node.js
   nvm install node
   nvm use node
   
   # Now install Signaler
   npm install -g @signaler/cli
   ```

3. **Configure npm to use different directory:**
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

### Windows Git Bash Issues

**Problem:** Signaler doesn't work properly in Git Bash on Windows.

**Solution:** Run the one-time setup script:
```bash
bash <(curl -s https://raw.githubusercontent.com/Dendro-X0/signaler/main/scripts/setup-bash-wrapper.sh)
```

### Node.js Version Compatibility

**Problem:** Signaler requires Node.js 18+ but older version is installed.

**Solutions:**

1. **Update Node.js:**
   - Download from https://nodejs.org/
   - Or use Node Version Manager (nvm)

2. **Check current version:**
   ```bash
   node --version
   ```

3. **Use nvm to manage versions:**
   ```bash
   nvm install 18
   nvm use 18
   ```

## Configuration Issues

### Invalid Configuration File

**Problem:** `Invalid configuration` or JSON parsing errors.

**Solutions:**

1. **Validate JSON syntax:**
   ```bash
   # Use online JSON validator or
   node -e "console.log(JSON.parse(require('fs').readFileSync('./apex.config.json', 'utf8')))"
   ```

2. **Use wizard to regenerate:**
   ```bash
   signaler wizard --force
   ```

3. **Check required fields:**
   ```json
   {
     "baseUrl": "http://localhost:3000",  // Required
     "pages": [                           // Required, non-empty
       {
         "path": "/",                     // Required, starts with /
         "label": "Home",                 // Required
         "devices": ["mobile"]            // Required, non-empty
       }
     ]
   }
   ```

### Base URL Connection Issues

**Problem:** `ECONNREFUSED` or `ERR_CONNECTION_REFUSED` errors.

**Solutions:**

1. **Verify server is running:**
   ```bash
   curl http://localhost:3000
   # or
   wget http://localhost:3000
   ```

2. **Check correct port:**
   ```bash
   # Common development ports
   http://localhost:3000  # Next.js, Create React App
   http://localhost:3001  # Alternative port
   http://localhost:8080  # Webpack dev server
   http://localhost:4000  # Gatsby
   ```

3. **Use correct protocol:**
   ```json
   {
     "baseUrl": "http://localhost:3000",  // Not https for local dev
   }
   ```

4. **Check firewall/network settings:**
   - Ensure localhost is accessible
   - Check if antivirus is blocking connections

### Dynamic Route Resolution

**Problem:** Routes with `[slug]` or `{id}` patterns fail.

**Solutions:**

1. **Use resolved paths only:**
   ```json
   {
     "pages": [
       { "path": "/products/shoes", "label": "Shoes" },      // ✅ Good
       { "path": "/products/[slug]", "label": "Product" }    // ❌ Bad
     ]
   }
   ```

2. **Use wizard for automatic detection:**
   ```bash
   signaler wizard  # Automatically resolves dynamic routes
   ```

3. **Manual route discovery:**
   ```bash
   # Check your framework's route structure
   find pages -name "*.js" -o -name "*.tsx"  # Next.js
   find src/routes -name "*.svelte"          # SvelteKit
   ```

## Audit Execution Issues

### Chrome Connection Failures

**Problem:** `Chrome disconnected` or `Protocol error` messages.

**Solutions:**

1. **Use stable mode:**
   ```bash
   signaler audit --stable  # Forces single-worker mode
   ```

2. **Reduce parallelism:**
   ```json
   {
     "parallel": 1,  // Reduce from default
   }
   ```

3. **Increase timeout:**
   ```json
   {
     "auditTimeoutMs": 60000,  // Increase from 30s default
   }
   ```

4. **Check Chrome installation:**
   ```bash
   # Chrome should be auto-installed by Lighthouse
   # If issues persist, try reinstalling
   npm uninstall -g @signaler/cli
   npm install -g @signaler/cli
   ```

### Memory Issues

**Problem:** `Out of memory` or system becomes unresponsive.

**Solutions:**

1. **Reduce parallel workers:**
   ```json
   {
     "parallel": 1,  // Start with 1, increase gradually
   }
   ```

2. **Audit in batches:**
   ```bash
   # Split large page sets into smaller batches
   signaler audit --focus-worst 10  # Audit worst 10 pages only
   ```

3. **Increase Node.js memory:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   signaler audit
   ```

4. **Use measure instead of audit:**
   ```bash
   signaler measure  # Lighter than full Lighthouse audits
   ```

### Timeout Errors

**Problem:** Audits timeout before completion.

**Solutions:**

1. **Increase timeout:**
   ```json
   {
     "auditTimeoutMs": 90000,  // Increase to 90 seconds
   }
   ```

2. **Check page performance:**
   - Ensure pages load quickly in browser
   - Fix any infinite loading states
   - Check for JavaScript errors

3. **Use faster throttling:**
   ```json
   {
     "throttlingMethod": "simulate",  // Faster than "devtools"
   }
   ```

4. **Reduce CPU slowdown:**
   ```json
   {
     "cpuSlowdownMultiplier": 2,  // Reduce from default 4
   }
   ```

### Inconsistent Results

**Problem:** Audit scores vary significantly between runs.

**Solutions:**

1. **Enable warm-up:**
   ```json
   {
     "warmUp": true,  // Reduces cold start effects
   }
   ```

2. **Increase runs:**
   ```json
   {
     "runs": 3,  // Multiple runs for averaging (default: 1)
   }
   ```

3. **Use consistent environment:**
   - Close other applications
   - Use dedicated CI environment
   - Ensure stable network connection

4. **Check for dynamic content:**
   - Disable A/B tests during auditing
   - Use fixed timestamps/IDs
   - Mock external API calls

## Performance Issues

### Slow Audit Execution

**Problem:** Audits take too long to complete.

**Solutions:**

1. **Increase parallelism:**
   ```json
   {
     "parallel": 2,  // Increase based on system resources
   }
   ```

2. **Use faster throttling:**
   ```json
   {
     "throttlingMethod": "simulate",  // Faster than "devtools"
   }
   ```

3. **Enable incremental mode:**
   ```json
   {
     "incremental": true,
     "buildId": "v1.2.3",  // Cache results between runs
   }
   ```

4. **Use measure for quick feedback:**
   ```bash
   signaler measure  # Much faster than full audits
   ```

### High Resource Usage

**Problem:** Signaler uses too much CPU/memory.

**Solutions:**

1. **Reduce parallelism:**
   ```json
   {
     "parallel": 1,  // Reduce resource usage
   }
   ```

2. **Lower CPU simulation:**
   ```json
   {
     "cpuSlowdownMultiplier": 2,  // Reduce from default 4
   }
   ```

3. **Audit fewer pages:**
   ```bash
   signaler audit --focus-worst 5  # Focus on problem pages
   ```

4. **Use CI-optimized settings:**
   ```json
   {
     "parallel": 1,
     "throttlingMethod": "simulate",
     "cpuSlowdownMultiplier": 2
   }
   ```

## Output Issues

### Missing Report Files

**Problem:** Expected output files are not generated.

**Solutions:**

1. **Check output directory:**
   ```bash
   ls -la .signaler/  # Default output directory
   ```

2. **Verify audit completion:**
   - Check for error messages in console
   - Ensure audit didn't fail silently

3. **Check permissions:**
   ```bash
   # Ensure write permissions to current directory
   touch .signaler/test.txt
   rm .signaler/test.txt
   ```

4. **Use explicit output options:**
   ```bash
   signaler audit --no-ai-fix --no-export  # Disable optional outputs
   ```

### Corrupted HTML Reports

**Problem:** HTML report doesn't open or displays incorrectly.

**Solutions:**

1. **Regenerate report:**
   ```bash
   signaler report  # Regenerate from existing data
   ```

2. **Check file size:**
   ```bash
   ls -lh .signaler/report.html  # Should be > 100KB
   ```

3. **Try different browser:**
   - Some browsers block local file access
   - Try Chrome, Firefox, or Safari

4. **Use HTTP server:**
   ```bash
   cd .signaler
   python -m http.server 8000
   # Open http://localhost:8000/report.html
   ```

## CI/CD Issues

### Exit Code Problems

**Problem:** CI doesn't fail when it should, or fails unexpectedly.

**Solutions:**

1. **Use budget enforcement:**
   ```bash
   signaler audit --fail-on-budget  # Exit 1 if budgets fail
   ```

2. **Check exit codes:**
   ```bash
   signaler audit; echo "Exit code: $?"
   ```

3. **Use CI mode:**
   ```bash
   signaler audit --ci --no-color  # CI-optimized output
   ```

### GitHub Actions Issues

**Problem:** Signaler fails in GitHub Actions.

**Solutions:**

1. **Use Node.js 18+:**
   ```yaml
   - uses: actions/setup-node@v3
     with:
       node-version: '18'
   ```

2. **Install Chrome dependencies:**
   ```yaml
   - run: |
       sudo apt-get update
       sudo apt-get install -y chromium-browser
   ```

3. **Use headless mode:**
   ```yaml
   - run: signaler audit --ci
     env:
       CHROME_PATH: /usr/bin/chromium-browser
   ```

## Framework-Specific Issues

### Next.js Issues

**Problem:** Routes not detected or build issues.

**Solutions:**

1. **Use correct build directory:**
   ```bash
   npm run build  # Ensure .next directory exists
   signaler wizard  # Auto-detects Next.js structure
   ```

2. **Handle dynamic routes:**
   ```bash
   # Wizard automatically resolves [slug] patterns
   signaler wizard --force
   ```

### Nuxt Issues

**Problem:** Nuxt routes not properly detected.

**Solutions:**

1. **Ensure build exists:**
   ```bash
   npm run build  # Creates .nuxt directory
   signaler wizard
   ```

2. **Check route patterns:**
   - `_id.vue` becomes `/[id]` (auto-resolved by wizard)
   - `index.vue` becomes `/`

### SvelteKit Issues

**Problem:** SvelteKit routes not found.

**Solutions:**

1. **Check route structure:**
   ```bash
   find src/routes -name "*.svelte"  # Should find route files
   signaler wizard  # Auto-detects structure
   ```

2. **Ensure dev server is running:**
   ```bash
   npm run dev  # Start SvelteKit dev server
   signaler audit  # In separate terminal
   ```

## Getting Help

### Enable Verbose Logging

```bash
signaler audit --log-level verbose  # Maximum logging
```

### Check System Information

```bash
signaler --version
node --version
npm --version
chrome --version  # or chromium --version
```

### Collect Debug Information

```bash
# Create debug report
signaler audit --log-level verbose > debug.log 2>&1
```

### Common Support Channels

1. **GitHub Issues:** https://github.com/Dendro-X0/ApexAuditor/issues
2. **Documentation:** https://signaler.dev/docs
3. **Examples:** https://github.com/signaler/examples

### Before Reporting Issues

1. **Update to latest version:**
   ```bash
   npm update -g @signaler/cli
   ```

2. **Try with minimal config:**
   ```json
   {
     "baseUrl": "http://localhost:3000",
     "pages": [
       { "path": "/", "label": "Home", "devices": ["mobile"] }
     ]
   }
   ```

3. **Test with stable mode:**
   ```bash
   signaler audit --stable --log-level verbose
   ```

4. **Include system information:**
   - Operating system and version
   - Node.js version
   - Signaler version
   - Error messages and logs
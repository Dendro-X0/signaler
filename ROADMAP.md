# Signaler Cortex Roadmap

**Signaler Cortex** turns the CLI into an automated optimization engineer. This roadmap outlines the evolution from a diagnostic tool to an intelligent remediation platform.

## 🧠 Phase 1: The Foundation (Completed)
**Goal**: Establish connectivity, configuration, and basic interaction capabilities.

- [x] **Provider Architecture**: Plug-and-play interface for AI models.
    - [x] Support **OpenAI** (GPT-4o, GPT-4-Turbo).
    - [x] Support **Ollama** (Llama 3, DeepSeek Coder) for local-first privacy.
    - [x] Support **Anthropic** (Claude 3.5 Sonnet) for complex code tasks.
- [x] **Configuration Management**: `.signalerrc` handling for keys, prompts, and model preferences.
- [x] **Basic CLI Commands**:
    - [x] `signaler ai init`: Interactive setup wizard.
    - [x] `signaler ai diagnose`: Send raw audit JSON to LLM for a summary.

## 👁️ Phase 2: The Context Engine
**Goal**: Give the AI "eyes" to see the code, not just the error report.

- [ ] **Source Mapping**:
    - [ ] Map Lighthouse DOM paths (e.g., `div.hero > img`) to React/Vue component files.
    - [ ] Parse `package.json` and config files to understand the tech stack (Next.js vs Remix, Tailwind vs CSS Modules).
- [ ] **Intelligent Retrieval**:
    - [ ] Extract relevant code snippets (AST-based or regex-based) to bundle with the prompt.
    - [ ] Token budget management (don't send the whole repo).

## 🤖 Phase 3: Specialist Agents
**Goal**: Specialized prompts and workflows for specific audit domains.

- [ ] **The Performance Engineer**:
    - [ ] Specializes in LCP/CLS/INP.
    - [ ] Knows how to optimize images, font loading, and script deferral.
- [ ] **The Accessibility Expert**:
    - [ ] Specializes in WCAG violations.
    - [ ] Can generate ARIA labels and structure fixes.
- [ ] **The SRE (Reliability)**:
    - [ ] Analyzes console errors and network failures.

## 🛠️ Phase 4: Automated Remediation
**Goal**: Close the loop by writing code.

- [ ] **Git Patch Generation**:
    - [ ] AI outputs structured diffs.
    - [ ] CLI applies diffs to a temporary branch or staging area.
- [ ] **Test Generation**:
    - [ ] `signaler gen-test`: Scans a page and writes a Playwright spec to verify it.
- [ ] **Interactive Fix Mode**:
    - [ ] `signaler fix <audit-id>`: The "Magic Wand" experience.

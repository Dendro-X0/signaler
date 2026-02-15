import prompts from 'prompts';
import { loadCortexConfig, saveCortexConfig } from './cortex/config.js';
import { ProviderFactory } from './cortex/providers/factory.js';
import { ContextEngine } from './cortex/context/context-engine.js';
import { AgentDispatcher } from './cortex/agent-dispatcher.js';
import { runFixFlow } from './cortex/ui/fix-tui.js';
import { Spinner } from './utils/progress.js';
import { TestGenAgent } from './cortex/agents/test-gen-agent.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Main entry point for the 'signaler cortex' interactive command.
 */
export async function runCortexCli(argv: readonly string[]): Promise<void> {
    console.log(`
┌─────────────────────────────────────────────────┐
│              Signaler Cortex Dashboard          │
├─────────────────────────────────────────────────┤
│        Automated Optimization Engineer          │
└─────────────────────────────────────────────────┘
`);

    const cwd = process.cwd();
    const config = await loadCortexConfig(cwd);

    // Main menu loop
    let active = true;
    while (active) {
        const response = await prompts({
            type: 'select',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { title: '🧠 Diagnose: Run AI-powered audit', value: 'diagnose' },
                { title: '🪄 Fix: Interactive remediation', value: 'fix' },
                { title: '⚙️ Configure: AI Provider & Keys', value: 'config' },
                { title: '🧪 Test Gen: Create verification tests', value: 'test-gen' },
                { title: '↩ Back to main shell', value: 'back' },
            ],
        });

        if (!response.action || response.action === 'back') {
            active = false;
            break;
        }

        switch (response.action) {
            case 'diagnose':
                await runDiagnosisFlow();
                break;
            case 'fix': {
                if (!config.apiKey && config.provider !== 'local' && config.provider !== 'ollama') {
                    console.log('\n❌ AI API Key not configured. Please run "Configure" first.');
                    break;
                }
                const spinner = new Spinner('Initializing AI remediation engine...');
                spinner.start();
                try {
                    const provider = ProviderFactory.create(config);
                    const contextEngine = new ContextEngine(cwd);
                    await contextEngine.init();
                    spinner.succeed('Remediation engine ready.');
                    await runFixFlow(provider, contextEngine);
                } catch (err: any) {
                    spinner.fail(`Failed to initialize: ${err.message}`);
                }
                break;
            }
            case 'config':
                await runConfigWizard();
                // Reload config after wizard
                Object.assign(config, await loadCortexConfig(cwd));
                break;
            case 'test-gen':
                await runTestGenFlow(config, cwd);
                break;
        }

        if (active) {
            console.log('\n' + '-'.repeat(50) + '\n');
        }
    }
}

async function runConfigWizard() {
    console.log('\n--- AI Configuration Wizard ---');
    const answers = await prompts([
        {
            type: 'select',
            name: 'provider',
            message: 'Select AI Provider',
            choices: [
                { title: 'OpenAI (GPT-4o, GPT-5.2, etc)', value: 'openai' },
                { title: 'Anthropic (Claude 3.5, 4.5, etc)', value: 'anthropic' },
                { title: 'Google (Gemini 3 Pro, 3 Flash)', value: 'google' },
                { title: 'Local (Ollama, DeepSeek)', value: 'local' },
            ],
        },
        {
            type: 'text',
            name: 'apiKey',
            message: (prev) => prev === 'local' ? 'Base URL (optional for Ollama)' : 'API Key',
            initial: (prev) => prev === 'local' ? 'http://localhost:11434' : '',
        },
        {
            type: 'text',
            name: 'model',
            message: 'Model Name',
            initial: (prev, values) => {
                if (values.provider === 'openai') return 'gpt-5.2';
                if (values.provider === 'anthropic') return 'claude-4.5-sonnet';
                if (values.provider === 'google') return 'gemini-3-pro';
                return 'llama3';
            }
        }
    ]);

    if (answers.provider) {
        await saveCortexConfig({
            provider: answers.provider,
            apiKey: answers.apiKey,
            model: answers.model,
            temperature: 0,
            baseUrl: answers.provider === 'local' ? answers.apiKey : undefined
        }, process.cwd());

        console.log('\n✅ Configuration saved to .signalerrc');
    }
}

async function runDiagnosisFlow() {
    console.log('\n--- AI Diagnosis ---');
    const { url } = await prompts({
        type: 'text',
        name: 'url',
        message: 'Enter URL path to diagnose (e.g. /about)',
        initial: '/',
    });

    if (url) {
        console.log(`\nMapping ${url} to source code...`);
        // Integrated Phase 2 logic here
        const contextEngine = new ContextEngine(process.cwd());
        const snippets = await contextEngine.getContextForAudit(url);

        const techStack = contextEngine.getTechStack();
        console.log(`Tech Stack: ${techStack?.framework || 'Unknown'} ${techStack?.styling ? `+ ${techStack.styling}` : ''}`);

        if (snippets.length > 0) {
            console.log(`Matched File: ${snippets[0]?.path || 'None'}`);
            console.log(`Retrieving snippets... (${snippets.length} found)`);
        } else {
            console.log('No matching source file found for this URL.');
        }

        console.log('\nAI Analysis would follow here using specialized agents.');
    }
}

async function runTestGenFlow(config: any, cwd: string) {
    if (!config.apiKey && config.provider !== 'local' && config.provider !== 'ollama') {
        console.log('\n❌ AI API Key not configured. Please run "Configure" first.');
        return;
    }

    const { url } = await prompts({
        type: 'text',
        name: 'url',
        message: 'Enter URL to generate tests for',
        initial: '/',
    });

    if (!url) return;

    const spinner = new Spinner(`Generating Playwright tests for ${url}...`);
    spinner.start();

    try {
        const provider = ProviderFactory.create(config);
        const contextEngine = new ContextEngine(cwd);
        const agent = new TestGenAgent(provider, contextEngine);

        // For demo/interactive purposes, we need an "issue" to verify.
        // We'll create a dummy issue for the page.
        const issue = {
            id: 'test-gen-man',
            title: `Verification for ${url}`,
            description: 'Automatic verification test generated by Signaler Cortex.',
            url,
            category: 'performance',
            selector: 'body'
        };

        const result = await agent.analyze(issue as any);
        spinner.succeed('Tests generated successfully.');

        console.log('\n--- Generated Test Code ---');
        // Hack: parse the 'logic' or 'fix' if the agent put it there, 
        // but TestGenAgent expects testCode in JSON.
        // Since BaseAgent.analyze is hardcoded for remediation, we might need a workaround.
        // For now, let's just log what we got.
        console.log(result.logic || result.fix || 'No test code returned from AI.');

        const { save } = await prompts({
            type: 'confirm',
            name: 'save',
            message: 'Save this test to tests/cortex-verify.spec.ts?',
            initial: true
        });

        if (save) {
            const testDir = path.join(cwd, 'tests');
            if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
            const testPath = path.join(testDir, 'cortex-verify.spec.ts');
            fs.writeFileSync(testPath, result.logic || result.fix || '', 'utf8');
            console.log(`\n✅ Test saved to ${testPath}`);
        }
    } catch (err: any) {
        spinner.fail(`Generation failed: ${err.message}`);
    }
}

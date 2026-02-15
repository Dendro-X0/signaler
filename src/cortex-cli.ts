import prompts from 'prompts';
import { loadCortexConfig, saveCortexConfig } from './cortex/config.js';
import { ProviderFactory } from './cortex/providers/factory.js';
import { ContextEngine } from './cortex/context/context-engine.js';
import { AgentDispatcher } from './cortex/agent-dispatcher.js';
import { runFixFlow } from './cortex/ui/fix-tui.js';

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
                const provider = ProviderFactory.create(config);
                const contextEngine = new ContextEngine(cwd);
                await runFixFlow(provider, contextEngine);
                break;
            }
            case 'config':
                await runConfigWizard();
                break;
            case 'test-gen':
                console.log('\nGenerating verification tests...');
                // TODO: Implement test gen flow
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

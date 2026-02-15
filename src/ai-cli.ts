import { loadCortexConfig } from './cortex/config.js';
import { ProviderFactory } from './cortex/providers/factory.js';
import { AiProvider } from './cortex/types.js';
import colors from 'ansi-colors';

/**
 * Main entry point for the 'ai' command namespace
 */
export async function runAiCli(argv: readonly string[]): Promise<void> {
    const subcommand = argv[2];

    if (!subcommand || subcommand === 'help' || subcommand === '--help') {
        printAiHelp();
        return;
    }

    switch (subcommand) {
        case 'init':
            await runAiInit();
            break;
        case 'test':
            await runAiTest();
            break;
        default:
            console.error(colors.red(`\n❌ Unknown AI subcommand: ${subcommand}`));
            printAiHelp();
            process.exitCode = 1;
    }
}

function printAiHelp(): void {
    console.log(`
${colors.cyan('Signaler AI (Cortex)')}

Help:
  signaler ai init    - Interactive setup for AI providers
  signaler ai test    - Test connectivity and model performance
  signaler ai help    - Show this help message
`);
}

/**
 * Interactive setup for AI providers
 */
async function runAiInit(): Promise<void> {
    console.log(colors.cyan('\n🤖 Signaler Cortex - Setup Wizard'));
    console.log(colors.gray('This will help you configure your AI provider.\n'));

    const prompts = (await import('prompts')).default;

    const response = await prompts([
        {
            type: 'select',
            name: 'provider',
            message: 'Select your AI provider:',
            choices: [
                { title: 'OpenAI (Cloud)', value: 'openai' },
                { title: 'Anthropic (Cloud)', value: 'anthropic' },
                { title: 'Ollama (Local)', value: 'ollama' },
                { title: 'Custom / Other Local', value: 'local' },
            ],
            initial: 0,
        },
        {
            type: (prev: any) => (prev === 'ollama' || prev === 'local' ? 'text' : 'password'),
            name: 'apiKey',
            message: (prev: any) => `Enter your ${String(prev).toUpperCase()} API Key:`,
            validate: (value: string, prev: any) =>
                (prev === 'ollama' || prev === 'local') ? true : (value.length > 0 || 'API Key is required'),
            initial: '',
        },
        {
            type: 'text',
            name: 'model',
            message: 'Enter model name (leave blank for default):',
            initial: (prev: any, values: any) => {
                if (values.provider === 'openai') return 'gpt-4o';
                if (values.provider === 'anthropic') return 'claude-3-5-sonnet-latest';
                if (values.provider === 'ollama') return 'llama3';
                return '';
            },
        },
    ]);

    if (!response.provider) {
        console.log(colors.yellow('\nSetup cancelled.'));
        return;
    }

    const config = {
        ai: {
            provider: response.provider,
            apiKey: response.apiKey || undefined,
            model: response.model || undefined,
        }
    };

    const fs = await import('node:fs');
    const path = await import('node:path');
    const configPath = path.join(process.cwd(), '.signalerrc');

    let existingConfig: any = {};
    if (fs.existsSync(configPath)) {
        try {
            existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch {
            // ignore
        }
    }

    const newConfig = { ...existingConfig, ...config };
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

    console.log(colors.green(`\n✅ Configuration saved to ${configPath}`));
}

/**
 * Test connectivity and model performance
 */
async function runAiTest(): Promise<void> {
    console.log(colors.cyan('\n🧪 Signaler Cortex - Connectivity Test'));

    try {
        const config = await loadCortexConfig();
        const provider = ProviderFactory.create(config);
        const metadata = provider.getMetadata();

        console.log(colors.gray(`Using provider: ${colors.white(metadata.provider)}`));
        console.log(colors.gray(`Using model: ${colors.white(metadata.model)}`));
        console.log(colors.gray('Sending test prompt...'));

        const start = Date.now();
        const result = await provider.generate({
            systemPrompt: 'You are a helpful web performance expert.',
            userPrompt: 'Tell me in 10 words why LCP is important for user experience.',
        });
        const duration = Date.now() - start;

        console.log(colors.green(`\n✅ Response received (${duration}ms):`));
        console.log(colors.white(`"${result.text}"`));

        if (result.usage) {
            console.log(colors.gray(`\nTokens used: ${result.usage.totalTokens} (P: ${result.usage.promptTokens}, C: ${result.usage.completionTokens})`));
        }

    } catch (err: any) {
        console.error(colors.red('\n❌ Test failed:'));
        console.error(colors.red(err.message));
        if (err.message.includes('apiKey')) {
            console.log(colors.yellow('\nHint: Use `signaler ai init` to configure your API key.'));
        }
    }
}

import { AiProvider, CortexConfig } from '../types.js';
import { AnthropicProvider } from './anthropic.js';
import { LocalProvider } from './local.js';
import { OpenAIProvider } from './openai.js';
import { GoogleProvider } from './google.js';

/**
 * Factory for creating AI providers based on configuration
 */
export class ProviderFactory {
    /**
     * Creates an AI provider instance based on the provided configuration
     */
    static create(config: CortexConfig): AiProvider {
        switch (config.provider) {
            case 'openai':
                return new OpenAIProvider(config);
            case 'anthropic':
                return new AnthropicProvider(config);
            case 'google':
                return new GoogleProvider(config);
            case 'ollama':
            case 'local':
                return new LocalProvider(config, config.provider);
            default:
                throw new Error(`Unsupported AI provider: ${config.provider}`);
        }
    }
}

import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { AiProvider, AiProviderType, CompletionRequest, CompletionResponse, CortexConfig } from '../types.js';

/**
 * Implementation of AI provider using Anthropic (Claude)
 */
export class AnthropicProvider implements AiProvider {
    private readonly config: CortexConfig;
    private readonly modelName: string;

    constructor(config: CortexConfig) {
        this.config = config;
        this.modelName = config.model || 'claude-3-5-sonnet-latest';
    }

    getMetadata(): { provider: AiProviderType; model: string } {
        return {
            provider: 'anthropic',
            model: this.modelName,
        };
    }

    async generate(request: CompletionRequest): Promise<CompletionResponse> {
        const anthropic = createAnthropic({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseUrl,
        });

        const { text, usage, response } = await generateText({
            model: anthropic(this.modelName),
            system: request.systemPrompt,
            prompt: request.userPrompt,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
        } as any);

        return {
            text,
            usage: usage ? {
                promptTokens: (usage as any).promptTokens,
                completionTokens: (usage as any).completionTokens,
                totalTokens: (usage as any).totalTokens,
            } : undefined,
            raw: response,
        };
    }
}
